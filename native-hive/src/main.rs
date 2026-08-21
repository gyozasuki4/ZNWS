#![allow(unused_must_use)]

use std::{
    collections::{HashMap, HashSet},
    fs,
    path::PathBuf,
    sync::mpsc::{self, Receiver, Sender},
    thread,
    time::{Duration, Instant},
};

use chrono::Local;
use eframe::egui::{
    self, Align, Align2, Color32, FontId, Frame, Layout, Pos2, Rect, RichText, Sense,
    Stroke, StrokeKind, Vec2,
};
use serde::{Deserialize, Serialize};

const DEFAULT_SERVER: &str = "https://ops.zasnetwx.com";
const BG: Color32 = Color32::from_rgb(7, 14, 22);
const PANEL: Color32 = Color32::from_rgb(13, 26, 38);
const PANEL_2: Color32 = Color32::from_rgb(17, 34, 48);
const BORDER: Color32 = Color32::from_rgb(43, 67, 84);
const TEXT_MUTED: Color32 = Color32::from_rgb(143, 165, 181);
const GREEN: Color32 = Color32::from_rgb(65, 184, 119);
const YELLOW: Color32 = Color32::from_rgb(226, 182, 75);
const RED: Color32 = Color32::from_rgb(221, 83, 83);
const BLUE: Color32 = Color32::from_rgb(64, 145, 208);

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum DataKind {
    Radar,
    Satellite,
    Model,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ToolPanel { Map, Layers, Radar, Satellite, Models, Hazards, More }

impl ToolPanel {
    fn label(self) -> &'static str { match self { Self::Map => "Map", Self::Layers => "Layers", Self::Radar => "Radar", Self::Satellite => "Satellite", Self::Models => "Models", Self::Hazards => "Hazard Services", Self::More => "More Tools" } }
    fn short(self) -> &'static str { match self { Self::Map => "MAP", Self::Layers => "LAY", Self::Radar => "RAD", Self::Satellite => "SAT", Self::Models => "MOD", Self::Hazards => "HAZ", Self::More => "•••" } }
}

impl DataKind {
    fn label(self) -> &'static str {
        match self {
            Self::Radar => "RADAR",
            Self::Satellite => "SATELLITE",
            Self::Model => "MODEL",
        }
    }
}

#[derive(Debug, Clone)]
struct Workspace {
    name: String,
    kind: DataKind,
    product: String,
    frame: usize,
    frames: usize,
    playing: bool,
    zoom: f32,
    pan: Vec2,
}

impl Workspace {
    fn radar() -> Self {
        Self {
            name: "Primary Radar".into(),
            kind: DataKind::Radar,
            product: "Base Reflectivity".into(),
            frame: 11,
            frames: 12,
            playing: false,
            zoom: 1.0,
            pan: Vec2::ZERO,
        }
    }
}

#[allow(dead_code)]
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SessionResponse {
    #[serde(default)]
    authenticated: bool,
    #[serde(default)]
    username: String,
    #[serde(default)]
    display_name: String,
}

#[derive(Debug)]
enum ConnectionState {
    Checking,
    Online(SessionResponse),
    Offline(String),
}

struct ConnectionResult(Result<SessionResponse, String>);

#[derive(Debug, Clone, Serialize, Deserialize)]
struct DeviceCredential {
    token: String,
    device: EnrolledDevice,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct EnrolledDevice {
    id: String,
    name: String,
    created_at: String,
}

struct EnrollmentResult(Result<DeviceCredential, String>);

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
struct TileKey { z: u32, x: u32, y: u32 }

struct TileResult { key: TileKey, image: Result<egui::ColorImage, String> }

struct HiveApp {
    server: String,
    server_edit: String,
    show_server: bool,
    workspaces: Vec<Workspace>,
    active: usize,
    connection: ConnectionState,
    connection_rx: Receiver<ConnectionResult>,
    connection_tx: Sender<ConnectionResult>,
    enrollment_rx: Receiver<EnrollmentResult>,
    enrollment_tx: Sender<EnrollmentResult>,
    credential: Option<DeviceCredential>,
    credential_path: PathBuf,
    enrollment_code: String,
    device_name: String,
    enrollment_status: String,
    tile_rx: Receiver<TileResult>,
    tile_tx: Sender<TileResult>,
    tile_textures: HashMap<TileKey, egui::TextureHandle>,
    tile_pending: HashSet<TileKey>,
    last_check: Instant,
    last_animation: Instant,
    show_layers: bool,
    dock_open: bool,
    selected_tool: ToolPanel,
}

impl HiveApp {
    fn new(cc: &eframe::CreationContext<'_>) -> Self {
        configure_style(&cc.egui_ctx);
        let server = std::env::var("HIVE_SERVER_URL")
            .unwrap_or_else(|_| DEFAULT_SERVER.to_owned())
            .trim_end_matches('/')
            .to_owned();
        let (tx, rx) = mpsc::channel();
        let (enrollment_tx, enrollment_rx) = mpsc::channel();
        let (tile_tx, tile_rx) = mpsc::channel();
        let credential_path = native_credential_path();
        let credential = load_native_credential(&credential_path);
        let needs_enrollment = credential.is_none();
        let app = Self {
            server_edit: server.clone(),
            server,
            show_server: needs_enrollment,
            workspaces: vec![Workspace::radar()],
            active: 0,
            connection: ConnectionState::Checking,
            connection_rx: rx,
            connection_tx: tx,
            enrollment_rx,
            enrollment_tx,
            credential,
            credential_path,
            enrollment_code: String::new(),
            device_name: hostname_label(),
            enrollment_status: String::new(),
            tile_rx,
            tile_tx,
            tile_textures: HashMap::new(),
            tile_pending: HashSet::new(),
            last_check: Instant::now() - Duration::from_secs(30),
            last_animation: Instant::now(),
            show_layers: true,
            dock_open: true,
            selected_tool: ToolPanel::Radar,
        };
        app
    }

    fn check_connection(&mut self) {
        if self.last_check.elapsed() < Duration::from_secs(10) {
            return;
        }
        self.last_check = Instant::now();
        let server = self.server.clone();
        let tx = self.connection_tx.clone();
        let token = self.credential.as_ref().map(|value| value.token.clone());
        thread::spawn(move || {
            let url = format!("{server}/api/session");
            let result = reqwest::blocking::Client::builder()
                .timeout(Duration::from_secs(8))
                .user_agent("ZASNet-Hive-Native/0.3.0")
                .build()
                .map_err(|error| error.to_string())
                .and_then(|client| {
                    let mut request = client.get(url);
                    if let Some(token) = token {
                        request = request.bearer_auth(token);
                    }
                    request
                        .send()
                        .and_then(|response| response.error_for_status())
                        .and_then(|response| response.json::<SessionResponse>())
                        .map_err(|error| error.to_string())
                });
            let _ = tx.send(ConnectionResult(result));
        });
    }

    fn receive_connection(&mut self) {
        while let Ok(ConnectionResult(result)) = self.connection_rx.try_recv() {
            self.connection = match result {
                Ok(session) => ConnectionState::Online(session),
                Err(error) => ConnectionState::Offline(error),
            };
        }
        while let Ok(EnrollmentResult(result)) = self.enrollment_rx.try_recv() {
            match result {
                Ok(credential) => {
                    match save_native_credential(&self.credential_path, &credential) {
                        Ok(()) => {
                            self.enrollment_status = format!("Enrolled as {}", credential.device.name);
                            self.credential = Some(credential);
                            self.enrollment_code.clear();
                            self.last_check = Instant::now() - Duration::from_secs(30);
                            self.connection = ConnectionState::Checking;
                        }
                        Err(error) => self.enrollment_status = format!("Could not save credential: {error}"),
                    }
                }
                Err(error) => self.enrollment_status = error,
            }
        }
    }

    fn receive_tiles(&mut self, ctx: &egui::Context) {
        while let Ok(result) = self.tile_rx.try_recv() {
            self.tile_pending.remove(&result.key);
            if let Ok(image) = result.image {
                let name = format!("basemap-{}-{}-{}", result.key.z, result.key.x, result.key.y);
                self.tile_textures.insert(result.key, ctx.load_texture(name, image, egui::TextureOptions::LINEAR));
            }
        }
    }

    fn request_tile(&mut self, key: TileKey) {
        if self.tile_textures.contains_key(&key) || !self.tile_pending.insert(key) { return; }
        let server = self.server.clone();
        let token = self.credential.as_ref().map(|value| value.token.clone());
        let tx = self.tile_tx.clone();
        thread::spawn(move || {
            let result = (|| -> Result<egui::ColorImage, String> {
                let client = reqwest::blocking::Client::builder().timeout(Duration::from_secs(10)).user_agent("ZASNet-Hive-Native/0.3.0").build().map_err(|error| error.to_string())?;
                let mut request = client.get(format!("{server}/api/native/basemap/{}/{}/{}.png", key.z, key.x, key.y));
                if let Some(token) = token { request = request.bearer_auth(token); }
                let bytes = request.send().and_then(|response| response.error_for_status()).and_then(|response| response.bytes()).map_err(|error| error.to_string())?;
                let decoded = image::load_from_memory(&bytes).map_err(|error| error.to_string())?.to_rgba8();
                let size = [decoded.width() as usize, decoded.height() as usize];
                Ok(egui::ColorImage::from_rgba_unmultiplied(size, decoded.as_raw()))
            })();
            let _ = tx.send(TileResult { key, image: result });
        });
    }

    fn begin_enrollment(&mut self) {
        let code = self.enrollment_code.trim().to_owned();
        let device_name = self.device_name.trim().to_owned();
        if code.is_empty() || device_name.is_empty() {
            self.enrollment_status = "Enter the workstation name and enrollment code.".into();
            return;
        }
        self.enrollment_status = "Enrolling workstation…".into();
        let server = self.server.clone();
        let tx = self.enrollment_tx.clone();
        thread::spawn(move || {
            let result = reqwest::blocking::Client::builder()
                .timeout(Duration::from_secs(10))
                .user_agent("ZASNet-Hive-Native/0.3.0")
                .build()
                .map_err(|error| error.to_string())
                .and_then(|client| {
                    client
                        .post(format!("{server}/api/native/enroll"))
                        .json(&serde_json::json!({ "code": code, "deviceName": device_name }))
                        .send()
                        .map_err(|error| error.to_string())
                })
                .and_then(|response| {
                    let status = response.status();
                    let body = response.text().map_err(|error| error.to_string())?;
                    if !status.is_success() {
                        let message = serde_json::from_str::<serde_json::Value>(&body).ok()
                            .and_then(|value| value.get("error").and_then(|value| value.as_str()).map(str::to_owned))
                            .unwrap_or_else(|| format!("Enrollment failed: HTTP {status}"));
                        return Err(message);
                    }
                    serde_json::from_str::<DeviceCredential>(&body).map_err(|error| error.to_string())
                });
            let _ = tx.send(EnrollmentResult(result));
        });
    }

    fn add_workspace(&mut self, kind: DataKind) {
        let count = self.workspaces.len() + 1;
        let (name, product) = match kind {
            DataKind::Radar => (format!("Radar {count}"), "Base Reflectivity"),
            DataKind::Satellite => (format!("Satellite {count}"), "GOES Clean IR"),
            DataKind::Model => (format!("Model {count}"), "HRRR Reflectivity"),
        };
        self.workspaces.push(Workspace {
            name,
            kind,
            product: product.into(),
            frame: 0,
            frames: 12,
            playing: false,
            zoom: 1.0,
            pan: Vec2::ZERO,
        });
        self.active = self.workspaces.len() - 1;
    }

    #[allow(dead_code)]
    fn top_bar(&mut self, ctx: &egui::Context) {
        egui::TopBottomPanel::top("top_bar")
            .frame(Frame::new().fill(PANEL).stroke(Stroke::new(1.0_f32, BORDER)).inner_margin(10.0))
            .show(ctx, |ui| {
                ui.horizontal(|ui| {
                    ui.label(RichText::new("ZASNET").strong().color(Color32::WHITE).size(17.0));
                    ui.label(RichText::new("HIVE NATIVE BETA").strong().color(BLUE).size(12.0));
                    ui.separator();
                    let (color, status) = match &self.connection {
                        ConnectionState::Checking => (YELLOW, "CHECKING SERVER".to_owned()),
                        ConnectionState::Online(session) if session.authenticated => {
                            let operator = if session.display_name.is_empty() { &session.username } else { &session.display_name };
                            (GREEN, format!("CONNECTED · {operator}"))
                        }
                        ConnectionState::Online(_) => (YELLOW, "ENROLLMENT REQUIRED".to_owned()),
                        ConnectionState::Offline(_) => (RED, "SERVER OFFLINE".to_owned()),
                    };
                    let (dot, _) = ui.allocate_exact_size(Vec2::splat(9.0), Sense::hover());
                    ui.painter().circle_filled(dot.center(), 4.0, color);
                    ui.label(RichText::new(status).strong().color(color).size(11.0));
                    ui.with_layout(Layout::right_to_left(Align::Center), |ui| {
                        if ui.button("Settings").clicked() {
                            self.show_server = true;
                        }
                        ui.label(RichText::new(format!("{} LOCAL", Local::now().format("%H:%M:%S"))).monospace().color(TEXT_MUTED));
                    });
                });
            });
    }

    fn workspace_bar(&mut self, ctx: &egui::Context) {
        egui::TopBottomPanel::top("workspaces")
            .frame(Frame::new().fill(Color32::from_rgb(6, 20, 30)).stroke(Stroke::new(1.0_f32, Color32::from_rgb(26, 54, 70))).inner_margin(4.0))
            .show(ctx, |ui| {
                ui.horizontal(|ui| {
                    for index in 0..self.workspaces.len() {
                        let workspace = &self.workspaces[index];
                        let selected = index == self.active;
                        let label = format!("{}  {}  ●●●", workspace.name, workspace.kind.label());
                        if ui.selectable_label(selected, label).clicked() {
                            self.active = index;
                        }
                    }
                    ui.menu_button("+ Workspace", |ui| {
                        for kind in [DataKind::Radar, DataKind::Satellite, DataKind::Model] {
                            if ui.button(kind.label()).clicked() {
                                self.add_workspace(kind);
                                ui.close();
                            }
                        }
                    });
                });
            });
    }

    fn tool_rail(&mut self, ctx: &egui::Context) {
        egui::SidePanel::left("tool_rail")
            .resizable(false)
            .exact_width(64.0)
            .frame(Frame::new().fill(Color32::from_rgb(8, 17, 25)).stroke(Stroke::new(1.0_f32, Color32::from_rgb(39, 55, 68))).inner_margin(5.0))
            .show(ctx, |ui| {
                ui.vertical_centered(|ui| {
                    Frame::new().fill(Color32::from_rgb(238, 242, 244)).corner_radius(7.0).inner_margin(6.0).show(ui, |ui| {
                        ui.label(RichText::new("ZWS").strong().color(Color32::from_rgb(12, 38, 55)).size(14.0));
                    });
                    ui.add_space(7.0);
                    for tool in [ToolPanel::Map, ToolPanel::Layers, ToolPanel::Radar, ToolPanel::Satellite, ToolPanel::Models, ToolPanel::Hazards, ToolPanel::More] {
                        let selected = self.dock_open && self.selected_tool == tool;
                        let button = egui::Button::new(RichText::new(tool.short()).strong().size(10.0))
                            .min_size(Vec2::new(50.0, 43.0))
                            .fill(if selected { Color32::from_rgb(27, 91, 126) } else { Color32::TRANSPARENT })
                            .stroke(Stroke::new(1.0_f32, if selected { Color32::from_rgb(105, 212, 255) } else { Color32::TRANSPARENT }));
                        if ui.add(button).on_hover_text(tool.label()).clicked() {
                            self.selected_tool = tool;
                            self.dock_open = true;
                        }
                    }
                    ui.with_layout(Layout::bottom_up(Align::Center), |ui| {
                        let (color, text) = if self.is_authenticated() { (GREEN, "ON") } else { (YELLOW, "ENR") };
                        ui.label(RichText::new(text).strong().color(color).size(9.0));
                        let (dot, _) = ui.allocate_exact_size(Vec2::splat(10.0), Sense::hover());
                        ui.painter().circle_filled(dot.center(), 4.0, color);
                    });
                });
            });
    }

    fn left_panel(&mut self, ctx: &egui::Context) {
        egui::SidePanel::left("products")
            .resizable(true)
            .default_width(300.0)
            .min_width(240.0)
            .max_width(430.0)
            .frame(Frame::new().fill(Color32::from_rgb(231, 240, 246)).stroke(Stroke::new(1.0_f32, Color32::from_rgb(159, 183, 198))).inner_margin(8.0))
            .show(ctx, |ui| {
                ui.visuals_mut().override_text_color = Some(Color32::from_rgb(28, 45, 57));
                ui.visuals_mut().widgets.inactive.bg_fill = Color32::from_rgb(248, 251, 253);
                ui.visuals_mut().widgets.inactive.weak_bg_fill = Color32::from_rgb(238, 245, 249);
                ui.visuals_mut().widgets.inactive.fg_stroke.color = Color32::from_rgb(48, 70, 83);
                ui.visuals_mut().widgets.hovered.bg_fill = Color32::from_rgb(218, 237, 248);
                ui.visuals_mut().widgets.active.bg_fill = Color32::from_rgb(188, 222, 241);
                ui.horizontal(|ui| {
                    ui.vertical(|ui| {
                        ui.label(RichText::new("OPERATIONS").strong().color(Color32::from_rgb(73, 107, 128)).size(9.0));
                        ui.label(RichText::new(self.selected_tool.label()).strong().color(Color32::from_rgb(17, 43, 59)).size(18.0));
                    });
                    ui.with_layout(Layout::right_to_left(Align::Center), |ui| {
                        if ui.button("×").clicked() { self.dock_open = false; }
                        let online = self.is_authenticated();
                        ui.label(RichText::new(if online { "Online" } else { "Enroll" }).strong().color(if online { Color32::from_rgb(32, 127, 72) } else { Color32::from_rgb(151, 104, 31) }).size(10.0));
                    });
                });
                ui.separator();
                let authenticated = self.is_authenticated();
                let workspace = &mut self.workspaces[self.active];
                match self.selected_tool {
                    ToolPanel::Map => {
                        section_heading(ui, "BASE MAP");
                        ui.selectable_label(true, "Standard light map");
                        ui.selectable_label(false, "Satellite imagery");
                        section_heading(ui, "LAYOUT");
                        ui.horizontal(|ui| { ui.selectable_label(true, "Single"); ui.selectable_label(false, "Dual"); ui.selectable_label(false, "Quad"); });
                        section_heading(ui, "APPEARANCE");
                        ui.checkbox(&mut self.show_layers, "Show map instruments");
                    }
                    ToolPanel::Layers => {
                        section_heading(ui, "ACTIVE LAYERS");
                        layer_row(ui, &workspace.product, true, 1.0);
                        layer_row(ui, "Warnings", true, 0.9);
                        layer_row(ui, "County boundaries", true, 0.75);
                        layer_row(ui, "Cities", true, 0.7);
                        section_heading(ui, "AVAILABLE");
                        ui.text_edit_singleline(&mut String::new());
                        ui.button("Add weather layer");
                    }
                    ToolPanel::Radar => {
                        section_heading(ui, "SOURCE");
                        ui.label(RichText::new(&workspace.product).color(Color32::from_rgb(21, 46, 61)));
                        ui.add_space(6.0);
                        ui.label("Radar site");
                        egui::ComboBox::from_id_salt("radar_site").selected_text("KCLE · Cleveland").show_ui(ui, |ui| {
                            ui.selectable_value(&mut workspace.product, "Base Reflectivity".into(), "KCLE · Cleveland");
                        });
                        section_heading(ui, "PRODUCT");
                        ui.selectable_value(&mut workspace.product, "Base Reflectivity".into(), "Base Reflectivity");
                        ui.selectable_value(&mut workspace.product, "Storm Relative Velocity".into(), "Storm Relative Velocity");
                        ui.selectable_value(&mut workspace.product, "Correlation Coefficient".into(), "Correlation Coefficient");
                        ui.selectable_value(&mut workspace.product, "Vertically Integrated Liquid".into(), "Vertically Integrated Liquid");
                        section_heading(ui, "DISPLAY");
                        ui.horizontal(|ui| { ui.button("Load latest"); ui.button("Refresh scans"); });
                    }
                    ToolPanel::Satellite => {
                        section_heading(ui, "NATIVE GOES");
                        ui.selectable_label(true, "GOES East");
                        ui.horizontal(|ui| { ui.button("CONUS"); ui.button("Meso 1"); ui.button("Meso 2"); });
                        section_heading(ui, "PRODUCT");
                        ui.selectable_value(&mut workspace.product, "GOES Clean IR".into(), "Clean IR");
                        ui.selectable_value(&mut workspace.product, "Water Vapor".into(), "Water Vapor");
                        ui.selectable_value(&mut workspace.product, "GeoColor".into(), "GeoColor");
                        section_heading(ui, "LOOP");
                        ui.horizontal(|ui| { ui.button("15m"); ui.button("30m"); ui.button("1h"); });
                    }
                    ToolPanel::Models => {
                        section_heading(ui, "SELECTION");
                        egui::ComboBox::from_id_salt("model_name").selected_text("HRRR").show_ui(ui, |ui| { let _ = ui.selectable_label(true, "HRRR"); });
                        ui.selectable_value(&mut workspace.product, "HRRR Reflectivity".into(), "Reflectivity");
                        ui.selectable_value(&mut workspace.product, "HRRR Wind Gust".into(), "Wind Gust");
                        ui.selectable_value(&mut workspace.product, "HRRR Near-surface Smoke".into(), "Near-surface Smoke");
                        section_heading(ui, "FORECAST TIME");
                        ui.add(egui::Slider::new(&mut workspace.frame, 0..=workspace.frames - 1).show_value(false));
                    }
                    ToolPanel::Hazards => {
                        section_heading(ui, "HAZARD SERVICES");
                        ui.label("Create and manage operational products.");
                        if ui.add_enabled(authenticated, egui::Button::new("Create hazard").fill(Color32::from_rgb(151, 74, 53))).clicked() {}
                        ui.button("Active products");
                        ui.button("Draft recovery");
                    }
                    ToolPanel::More => {
                        for label in ["Ops settings", "DSS points", "NHC tropics", "SPC watches", "Data & server", "Operations guide"] { ui.button(label); }
                    }
                }
            });
    }

    #[allow(dead_code)]
    fn right_panel(&mut self, ctx: &egui::Context) {
        if !self.show_layers {
            return;
        }
        egui::SidePanel::right("layers")
            .resizable(true)
            .default_width(220.0)
            .min_width(175.0)
            .frame(Frame::new().fill(PANEL).stroke(Stroke::new(1.0_f32, BORDER)).inner_margin(12.0))
            .show(ctx, |ui| {
                ui.horizontal(|ui| {
                    ui.label(RichText::new("ACTIVE LAYERS").strong().color(TEXT_MUTED).size(10.0));
                    ui.with_layout(Layout::right_to_left(Align::Center), |ui| {
                        if ui.small_button("×").clicked() { self.show_layers = false; }
                    });
                });
                ui.add_space(8.0);
                layer_row(ui, &self.workspaces[self.active].product, true, 1.0);
                layer_row(ui, "Warnings", true, 0.9);
                layer_row(ui, "County boundaries", true, 0.75);
                layer_row(ui, "Cities", true, 0.7);
                ui.add_space(10.0);
                if ui.button("+ Add layer").clicked() {}
                ui.separator();
                ui.label(RichText::new("NATIVE STATUS").strong().color(TEXT_MUTED).size(10.0));
                ui.small("No WebView · GPU map canvas");
                ui.small("Independent workspace state");
                ui.small("Server API connection");
            });
    }

    fn map_canvas(&mut self, ctx: &egui::Context) {
        egui::CentralPanel::default()
            .frame(Frame::new().fill(BG).inner_margin(0.0))
            .show(ctx, |ui| {
                let available = ui.available_size();
                let (response, painter) = ui.allocate_painter(available, Sense::click_and_drag());
                let rect = response.rect;
                let (pan, zoom, kind, product) = {
                    let workspace = &mut self.workspaces[self.active];
                    if response.dragged() {
                        workspace.pan += response.drag_delta();
                    }
                    if response.hovered() {
                        let scroll = ui.input(|input| input.raw_scroll_delta.y);
                        if scroll.abs() > 0.0 {
                            workspace.zoom = (workspace.zoom * (1.0 + scroll * 0.0025)).clamp(0.45, 1024.0);
                        }
                    }
                    (workspace.pan, workspace.zoom, workspace.kind, workspace.product.clone())
                };

                painter.rect_filled(rect, 0.0, Color32::from_rgb(8, 19, 28));
                let zoom_level = (4.0 + zoom.log2()).round().clamp(3.0, 14.0) as u32;
                let tile_scale = zoom / 2.0_f32.powi(zoom_level as i32 - 4);
                let tile_size = 256.0 * tile_scale;
                let (center_x, center_y) = lon_lat_to_tile(-81.69, 41.5, zoom_level);
                let x_start = (center_x + (rect.left() - rect.center().x - pan.x) as f64 / tile_size as f64).floor() as i32 - 1;
                let x_end = (center_x + (rect.right() - rect.center().x - pan.x) as f64 / tile_size as f64).ceil() as i32 + 1;
                let y_start = (center_y + (rect.top() - rect.center().y - pan.y) as f64 / tile_size as f64).floor() as i32 - 1;
                let y_end = (center_y + (rect.bottom() - rect.center().y - pan.y) as f64 / tile_size as f64).ceil() as i32 + 1;
                let limit = 2_i32.pow(zoom_level);
                let mut needed = Vec::new();
                for tile_y in y_start..=y_end {
                    if tile_y < 0 || tile_y >= limit { continue; }
                    for raw_x in x_start..=x_end {
                        let tile_x = raw_x.rem_euclid(limit);
                        let key = TileKey { z: zoom_level, x: tile_x as u32, y: tile_y as u32 };
                        let min = rect.center() + pan + Vec2::new(((raw_x as f64 - center_x) * tile_size as f64) as f32, ((tile_y as f64 - center_y) * tile_size as f64) as f32);
                        let tile_rect = Rect::from_min_size(min, Vec2::splat(tile_size + 0.5));
                        if let Some(texture) = self.tile_textures.get(&key) {
                            painter.image(texture.id(), tile_rect, Rect::from_min_max(Pos2::ZERO, Pos2::new(1.0, 1.0)), Color32::WHITE);
                        } else {
                            painter.rect_filled(tile_rect, 0.0, Color32::from_rgb(10, 24, 34));
                            needed.push(key);
                        }
                    }
                }
                for key in needed { self.request_tile(key); }
                let badge = Rect::from_min_size(Pos2::new(rect.right() - 142.0, rect.top() + 9.0), Vec2::new(132.0, 32.0));
                painter.rect_filled(badge, 5.0, Color32::from_rgba_unmultiplied(8, 33, 48, 235));
                painter.rect_stroke(badge, 6.0, Stroke::new(1.0_f32, BORDER), StrokeKind::Inside);
                painter.text(badge.min + Vec2::new(7.0, 5.0), Align2::LEFT_TOP, kind.label(), FontId::monospace(8.0), BLUE);
                painter.text(badge.min + Vec2::new(7.0, 16.0), Align2::LEFT_TOP, product, FontId::proportional(10.0), Color32::WHITE);

                let warnings = Rect::from_min_size(Pos2::new(rect.right() - 246.0, rect.bottom() - 54.0), Vec2::new(236.0, 36.0));
                painter.rect_filled(warnings, 6.0, Color32::from_rgba_unmultiplied(8, 28, 41, 238));
                painter.rect_stroke(warnings, 6.0, Stroke::new(1.0_f32, Color32::from_rgb(69, 101, 120)), StrokeKind::Inside);
                painter.text(warnings.left_center() + Vec2::new(9.0, 0.0), Align2::LEFT_CENTER, "Active warnings    0", FontId::proportional(11.0), Color32::WHITE);
                painter.text(warnings.right_center() - Vec2::new(8.0, 0.0), Align2::RIGHT_CENTER, "All ZWS", FontId::monospace(8.0), Color32::from_rgb(144, 190, 215));

                if self.tile_textures.is_empty() {
                    painter.text(rect.center(), Align2::CENTER_CENTER, "LOADING NATIVE BASEMAP", FontId::proportional(16.0), TEXT_MUTED);
                }
                painter.text(rect.left_bottom() + Vec2::new(12.0, -12.0), Align2::LEFT_BOTTOM, format!("Map zoom {} · drag to pan · wheel to zoom · © OpenStreetMap © CARTO", zoom_level), FontId::monospace(10.0), TEXT_MUTED);
            });
    }

    fn timeline(&mut self, ctx: &egui::Context) {
        egui::TopBottomPanel::bottom("timeline")
            .frame(Frame::new().fill(Color32::from_rgb(6, 20, 29)).stroke(Stroke::new(1.0_f32, Color32::from_rgb(51, 89, 108))).inner_margin(5.0))
            .show(ctx, |ui| {
                let workspace = &mut self.workspaces[self.active];
                ui.horizontal(|ui| {
                    ui.selectable_label(workspace.kind == DataKind::Radar, "RADAR");
                    ui.selectable_label(workspace.kind == DataKind::Satellite, "SATELLITE");
                    ui.selectable_label(workspace.kind == DataKind::Model, "MODEL");
                    ui.with_layout(Layout::right_to_left(Align::Center), |ui| { ui.small_button("—"); });
                });
                ui.separator();
                ui.horizontal(|ui| {
                    if ui.button(if workspace.playing { "Pause" } else { "Play" }).clicked() {
                        workspace.playing = !workspace.playing;
                    }
                    if ui.button("‹").clicked() {
                        workspace.frame = workspace.frame.saturating_sub(1);
                    }
                    if ui.button("›").clicked() {
                        workspace.frame = (workspace.frame + 1).min(workspace.frames - 1);
                    }
                    ui.separator();
                    for index in 0..workspace.frames {
                        let color = if index == workspace.frame { GREEN } else { Color32::from_rgb(62, 76, 87) };
                        let (frame_rect, response) = ui.allocate_exact_size(Vec2::new(18.0, 18.0), Sense::click());
                        ui.painter().rect_filled(frame_rect, 3.0, color);
                        if response.clicked() { workspace.frame = index; }
                    }
                    ui.separator();
                    ui.label(RichText::new(format!("FRAME {:02}/{:02}", workspace.frame + 1, workspace.frames)).monospace().color(TEXT_MUTED));
                });
            });
    }

    fn settings_window(&mut self, ctx: &egui::Context) {
        if !self.show_server { return; }
        let mut open = self.show_server;
        let mut close_after = false;
        egui::Window::new("Native Hive Settings")
            .open(&mut open)
            .collapsible(false)
            .resizable(false)
            .show(ctx, |ui| {
                ui.label("Operations server");
                ui.text_edit_singleline(&mut self.server_edit);
                ui.small("The native client connects to APIs only; it does not load the website.");
                ui.separator();
                if let Some(credential) = &self.credential {
                    ui.colored_label(GREEN, format!("Enrolled: {}", credential.device.name));
                    ui.small(format!("Device ID: {}", credential.device.id));
                    if ui.button("Remove credential from this computer").clicked() {
                        if fs::remove_file(&self.credential_path).is_ok() {
                            self.credential = None;
                            self.connection = ConnectionState::Checking;
                            self.last_check = Instant::now() - Duration::from_secs(30);
                        }
                    }
                } else {
                    ui.label("Workstation name");
                    ui.text_edit_singleline(&mut self.device_name);
                    ui.label("Single-use enrollment code");
                    ui.text_edit_singleline(&mut self.enrollment_code);
                    if ui.button("Enroll this workstation").clicked() {
                        self.begin_enrollment();
                    }
                    if !self.enrollment_status.is_empty() {
                        ui.label(&self.enrollment_status);
                    }
                }
                ui.horizontal(|ui| {
                    if ui.button("Open browser backup").clicked() {
                        let _ = webbrowser::open(&format!("{}/hive-beta", self.server));
                    }
                    if ui.button("Apply").clicked() {
                        self.server = self.server_edit.trim_end_matches('/').to_owned();
                        self.last_check = Instant::now() - Duration::from_secs(30);
                        self.connection = ConnectionState::Checking;
                        close_after = true;
                    }
                });
                if let ConnectionState::Offline(error) = &self.connection {
                    ui.colored_label(RED, error);
                }
            });
        self.show_server = open && !close_after;
    }

    fn is_authenticated(&self) -> bool {
        matches!(&self.connection, ConnectionState::Online(session) if session.authenticated)
    }
}

impl eframe::App for HiveApp {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        self.check_connection();
        self.receive_connection();
        self.receive_tiles(ctx);

        if self.workspaces[self.active].playing && self.last_animation.elapsed() >= Duration::from_millis(160) {
            let workspace = &mut self.workspaces[self.active];
            workspace.frame = (workspace.frame + 1) % workspace.frames;
            self.last_animation = Instant::now();
        }

        self.tool_rail(ctx);
        if self.dock_open { self.left_panel(ctx); }
        self.workspace_bar(ctx);
        self.timeline(ctx);
        self.map_canvas(ctx);
        self.settings_window(ctx);
        ctx.request_repaint_after(Duration::from_millis(33));
    }
}

fn layer_row(ui: &mut egui::Ui, label: &str, mut visible: bool, opacity: f32) {
    Frame::new().fill(PANEL_2).stroke(Stroke::new(1.0_f32, BORDER)).corner_radius(5.0).inner_margin(8.0).show(ui, |ui| {
        ui.horizontal(|ui| {
            ui.checkbox(&mut visible, "");
            ui.vertical(|ui| {
                ui.label(RichText::new(label).strong().size(12.0));
                ui.label(RichText::new(format!("Opacity {}%", (opacity * 100.0) as i32)).color(TEXT_MUTED).size(10.0));
            });
        });
    });
    ui.add_space(5.0);
}

fn section_heading(ui: &mut egui::Ui, label: &str) {
    ui.add_space(10.0);
    ui.separator();
    ui.label(RichText::new(label).strong().color(Color32::from_rgb(58, 112, 145)).size(9.0));
    ui.add_space(3.0);
}

fn lon_lat_to_tile(longitude: f64, latitude: f64, zoom: u32) -> (f64, f64) {
    let scale = 2_f64.powi(zoom as i32);
    let x = (longitude + 180.0) / 360.0 * scale;
    let latitude_radians = latitude.clamp(-85.051_128_78, 85.051_128_78).to_radians();
    let y = (1.0 - (latitude_radians.tan() + 1.0 / latitude_radians.cos()).ln() / std::f64::consts::PI) / 2.0 * scale;
    (x, y)
}

fn configure_style(ctx: &egui::Context) {
    let mut visuals = egui::Visuals::dark();
    visuals.panel_fill = PANEL;
    visuals.window_fill = PANEL;
    visuals.extreme_bg_color = BG;
    visuals.widgets.inactive.bg_fill = PANEL_2;
    visuals.widgets.inactive.weak_bg_fill = PANEL_2;
    visuals.widgets.hovered.bg_fill = Color32::from_rgb(28, 53, 70);
    visuals.widgets.active.bg_fill = Color32::from_rgb(32, 69, 92);
    visuals.selection.bg_fill = Color32::from_rgb(35, 98, 139);
    ctx.set_visuals(visuals);
}

fn native_credential_path() -> PathBuf {
    let base = std::env::var_os("XDG_CONFIG_HOME")
        .map(PathBuf::from)
        .or_else(|| std::env::var_os("APPDATA").map(PathBuf::from))
        .or_else(|| std::env::var_os("HOME").map(|home| PathBuf::from(home).join(".config")))
        .unwrap_or_else(|| PathBuf::from("."));
    base.join("zasnet-hive-native").join("device.json")
}

fn load_native_credential(path: &PathBuf) -> Option<DeviceCredential> {
    fs::read_to_string(path).ok().and_then(|body| serde_json::from_str(&body).ok())
}

fn save_native_credential(path: &PathBuf, credential: &DeviceCredential) -> Result<(), String> {
    let parent = path.parent().ok_or_else(|| "Invalid credential path".to_owned())?;
    fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    fs::write(path, serde_json::to_vec(credential).map_err(|error| error.to_string())?)
        .map_err(|error| error.to_string())?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(path, fs::Permissions::from_mode(0o600)).map_err(|error| error.to_string())?;
    }
    Ok(())
}

fn hostname_label() -> String {
    std::env::var("HOSTNAME")
        .or_else(|_| std::env::var("COMPUTERNAME"))
        .unwrap_or_else(|_| "Hive Native Workstation".into())
}

fn main() -> eframe::Result<()> {
    let options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default()
            .with_title("ZASNet Hive Native Beta")
            .with_inner_size([1500.0, 900.0])
            .with_min_inner_size([1100.0, 680.0]),
        ..Default::default()
    };
    eframe::run_native(
        "ZASNet Hive Native Beta",
        options,
        Box::new(|cc| Ok(Box::new(HiveApp::new(cc)))),
    )
}
