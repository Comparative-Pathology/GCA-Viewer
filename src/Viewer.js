
/*
import { Viewer1D } from '../GCA_1DViewer/src/Viewer1D.js';
import { Utility, clamp, Sidebar, MessagePopup, ModelPopup } from '../GCA_1DViewer/src/modules/GCA_Utilities.js'
*/

let Utility = GCA_Utils.Utility
let clamp = GCA_Utils.clamp
let Sidebar = GCA_Utils.Sidebar
let MessagePopup = GCA_Utils.MessagePopup
let ModelPopup = GCA_Utils.ModelPopup  
let Viewer1D = GCA_Viewer1D.Viewer1D



import { ModelRenderer2D, ModelRenderer3D } from './ModelRendere.js';

export { Viewer} 

const splitterWidth = 3.5;  //half width of the splitter 			

//Viewer needs to extend EventTarget so the 1D viewer can dispatch events to it
class Viewer extends EventTarget {
	
	constructor (container) {
		super();
		this.container = container;

		this.widthLimitSectionPanel = 60;
		this.defaultHeightTopPanel1D = .38; //35%
		
		this.fullView1D = true;
		this.createComponents(this.container);
		this.init();
	}
	
	init() {
		this.viewer1D = new Viewer1D(this.container1D);
		this.viewer1D.addRoiChangeListener(this, this.handleRoiChange3D);
		this.viewer1D.addModelChangeListener(this, this.handleLinkLandmarks);
		this.viewer1D.addFullviewToggleListener(this, this.handleToggleFullView1D);
		
//		this.viewer1D.loadModel('./models/human_1D_1N.xml', this.handleModelReady.bind(this));
		this.viewer1D.loadModel('../models/EdinGCA_1D_00010_1_15.json', this.handleModelReady1D.bind(this));
	}
	
	loadModels() {
		let models = [];
		let path='../';
//		models[0] = this.loadModel2D(path + 'models/EdinGCA_2D_00030_1_7_bill.json', path + 'GCA_2DViewer/models/anatamogram');
		models[0] = this.loadModel2D(path + 'models/EdinGCA_2D_00030_1_10.json', path + 'GCA_2DViewer/models/anatamogram');

		models[1] = this.loadModels3D(path + 'models/EdinGCA_3D_00020_1_12.json', path + 'GCA_3DViewer/models/Inflated');
//		models[2] = this.loadModels3D(path + 'models/HuBMAPVHF_3D00XXX_X_X.json', path + 'GCA_3DViewer/models/HuBMAP_F');
		models[2] = this.loadModels3D(path + 'models/HuBMAPVHF_3D_00080_1_6.json', path + 'GCA_3DViewer/models/HuBMAP_F');
//		models[3] = this.loadModels3D(path + 'models/HuBMAPVHM_3D_00050_1_4.json', path + 'GCA_3DViewer/models/HuBMAP_M');
		models[3] = this.loadModels3D(path + 'models/HuBMAPVHM_3D_00070_1_5.json', path + 'GCA_3DViewer/models/HuBMAP_M');
		models[4] = this.loadModels3D(path + 'models/EdinGCA_3D_00060_1_5.json', path + 'GCA_3DViewer/models/Noninflated');

		for(let i=0; i<models.length; i++) {
			models[i].config.landmarks.sort((a, b) => (a.paths[0] == b.paths[0])? a.position[0] - b.position[0] : a.paths[0] - b.paths[0] );
		}
		
		return models;
	}

	loadModelInfo(file, srcDir) {
		let model = new Object();
		model.config =  Utility.loadJson(file);
		model.id = model.config.id;
		model.name = model.config.name; // im00403 'Inflated';   		
		model.description = model.config.description;
		model.species = model.config.species;
		model.owner = model.config.owner;
		model.contact = model.config.contact;
		model.version = model.config.version + '.' + model.config.sub_version;
		model.formatVersion = model.config.format_version;
		model.type = model.config.model_type;
		model.srcDir = srcDir;
		
		return model;
	}	
	
	/****************************************** */
	loadModel2D(file, srcDir) {
		let model = this.loadModelInfo(file, srcDir);

		model.hasSections = false;
		for(let modelObject of model. config.model_objects) {
			if(modelObject.group == 'REFERENCE_IMAGES') {
				modelObject.filepath = model.srcDir + '/' + modelObject.filepath;
				modelObject.filepath = modelObject.filepath.replace(/\/$/, "");
			}
			if(modelObject.group == 'ANATOMY_IMAGES') {
				modelObject.filepath = model.srcDir + '/' + modelObject.filepath;
				modelObject.filepath = modelObject.filepath.replace(/\/$/, "");
			}
		}
		for(let path of model.config.paths) {
			path.filepath = model.srcDir + '/' + path.filepath;
			path.filepath = path.filepath.replace(/\/$/, "");
		}
		model.config.landmarks.sort((a, b) => (a.paths[0] == b.paths[0])? a.position[0] - b.position[0] : a.paths[0] - b.paths[0] );

		return model;
	}	

	/*
	 * Should be used to load a new model to the viewer. It can be called after instantiating the viewer
	 * to load and display a model for the first time or to replace the current model load the in the viewer. 
	 *
	 * @param {string} file The file name and path containing 1D model in XML format. 
	 * @param readyCallback callback function to run when the Viewer is ready
	 */
	loadModels3D(file, srcDir) {
		let model = this.loadModelInfo(file, srcDir);
		model.config.paths = model.config.paths;	
		model.config.anatomy_surfaces = [];
		model.config.section_files = [];
		
		model.hasSections = false;
		
		for(let modelObject of model.config.model_objects) {
			if(modelObject.group == 'ANATOMY_SURFACES') {
				modelObject.filepath = model.srcDir + '/' + modelObject.filepath;
				modelObject.filepath = modelObject.filepath.replace(/\/$/, "");
				model.config.anatomy_surfaces.push(modelObject);
			}
			if(modelObject.group == 'SECTION_FILES') {
				modelObject.filepath = model.srcDir + '/' + modelObject.filepath;
				modelObject.filepath = modelObject.filepath.replace(/\/$/, "");
				model.config.section_files.push(modelObject);
				model.hasSections = true;
			}

			if(modelObject.group == 'REFERENCE_SURFACES') {
				modelObject.filepath = model.srcDir + '/' + modelObject.filepath;
				modelObject.filepath = modelObject.filepath.replace(/\/$/, "");
				model.config.reference_surface = modelObject;
			}

			if(modelObject.group == 'GLOBAL_DISPLAY_PROP') {
				model.config.display_props = modelObject.display_props;
			}

			if(modelObject.group == 'DISC') {
				model.config.disc = modelObject;
			}

			if(modelObject.group == 'MODEL_PROP') {
				model.config.model_prop = modelObject;
			}
		}

		for(let path of model.config.paths) {
			
			path.filepath = model.srcDir + '/' + path.filepath;
			path.filepath = path.filepath.replace(/\/$/, "");
		}
		model.config.landmarks = model.config.landmarks;
		model.config.landmarks.sort((a, b) => (a.paths[0] == b.paths[0])? a.position[0] - b.position[0] : a.paths[0] - b.paths[0] );
		return model;
	}
	
	
	handleModelReady1D() {
		this.adjustSplitters()
		this.init3D();
		new ResizeObserver(this.viewerResize.bind(this)).observe(this.container);
		
// API test
/*		
		this.viewer1D.updateRoi(100, 1);
		this.viewer1D.updateRoi(200, 300);
		this.viewer1D.changeTheme(1);
		this.viewer1D.setFullView(false);
//		this.viewer1D.loadModel('mouse_1D_1.xml');
		this.viewer1D.addMarker(350, 'testing API', 0); //  0:the colon branch
*/			
	}

	init3D() {
		this.models = this.loadModels();

		this.panel3D = new Panel3D(this, this.container3D, this.models);
		this.panel3D.init();
		this.panel3D.setViewersPickListener(this);
		if(this.savedLinkLandmarksEvent) {
			this.handleLinkLandmarks(this.savedLinkLandmarksEvent);
		}
		this.addEventListener('3D_model_pick', this.handleViewerPick.bind(this));  // to catch picker events from 3D Viewers	
	}

	adjustSplitters() {
		let pos = this.container.clientHeight*this.defaultHeightTopPanel1D;
		if(this.viewer1D.fullHeight && pos > this.viewer1D.fullHeight) {
			pos = this.viewer1D.fullHeight;
		}
		pos = Math.round(pos + splitterWidth);
		if(pos != this.hSplitter.position()[0]) {
			this.hSplitter.position(pos);
		}
	}

	viewerResize() {
		let h = this.container.clientHeight;
		let splitterPos = this.hSplitter.position()[0];
		let splitterInLimit = (Math.floor(splitterPos) <= Viewer1D.getHeightLimitTopView+1);

		if(!this.hSplitterStatus) {
			if(splitterInLimit) {
				this.hSplitterStatus = 1; // splitter position <= limit
			} 
			else { 
				this.hSplitterStatus = 2; // splitter position > limit
			}
			this.hSave = h;
			return;
		}

		if(this.hSplitterStatus == 2) {
			let pos = splitterPos * h / this.hSave
			if(splitterInLimit || pos<=Viewer1D.getHeightLimitTopView) {
				this.hSplitterStatus = 1;
				this.pSave = splitterPos;
				this.hSplitter.position(Viewer1D.getHeightLimitTopView);		
			}
			else {
				this.hSplitter.position(pos);		
				this.hSave = h;
			}			
				this.hSplitter.refresh();
		}	
		if(this.hSplitterStatus == 1) {
			if(h > this.hSave) {
				this.hSplitterStatus = 2;
				splitterPos = this.pSave? this.pSave : splitterPos;
				let pos = splitterPos * h / this.hSave
				this.hSplitter.position(pos);		
				this.hSplitter.refresh();
				this.hSave = h;
			}
		}	

//		this.viewer1D.resize();
		if(this.panel3D) {
			this.panel3D.redraw();
		}
	}	
	
	createComponents(container) {
		this.container = container;
		let h = '100%';
		if (!container) {
			this.container = Utility.addElement(document.body, 'div', 'main-container', 'hidden-scroll');
//			let bodyElement = $('body');
//			let hMargin = parseInt(bodyElement.css('margin-top')) + parseInt(bodyElement.css('margin-bottom'));
//			h = ((document.body.clientHeight || document.documentElement.clientHeight || window.innerHeight) - hMargin) + 'px';
		}
		this.container1D = Utility.addElement(this.container, 'div', 'panel-1D');//, 'hidden-scroll');
		
		let bottomContainer = Utility.addElement(this.container, 'div', 'bottom-container', 'hidden-scroll')
		
		Utility.addStyle('#main-container', `width: 100%; height: ${h}; background-color: #222;`);

		//Add a horizontal splitter
		let pos = Math.round(this.container.clientHeight*this.defaultHeightTopPanel1D);
		this.hSplitter = $('#main-container').split({position: pos, limit: Viewer1D.getHeightLimitTopView, onDrag: this.handleSplitterDrag.bind(this)});

		this.container1D.style.height = pos + 'px';
		let bh = Utility.innerHeight(this.container) - pos - splitterWidth;
		Utility.addStyle('#bottom-container', `width:100%; height: ${bh}px; background-color: #393940;`);
	
		//Add a container for all 3D view panels
		this.container3D = Utility.addElement(bottomContainer, 'div', 'viewers3D-container', 'container3D');	

		Utility.addStyle('.hidden-scroll', `overflow:hidden;
											-ms-overflow-style: none;  /* IE and Edge */  
											scrollbar-width: none;  /* Firefox */`);
		Utility.addStyle('.hidden-scroll::-webkit-scrollbar',  `display: none;
																-webkit-appearance: none;
																width: 0;
																height: 0;`);
	}
	
	handleSplitterDrag() {	//only adjust 3D view, 1D view has a resize observer
		if(this.panel3D) {
			this.panel3D.redraw();
		}
	}
	
	createMarkerSidebar() {
		let content = ` <br><span class="icon-text" id="save-marker"><i class="material-icons">save</i>Save markers</span>
						<br><span class="icon-text" id="load-marker"><i class="material-icons">push_pin</i>Load markers</span>
						<br><span class="icon-text" id="clear-marker"><i class="material-icons">clear</i>Clear markers</span>`;
						
		new Sidebar(this.container1D, 'left', 'marker-sidebar', content, 170);
//		new SidebarRight(this.container1D, 'marker-sidebar', content, 170);

		this.saveMarkerElem = document.getElementById('save-marker');
		this.saveMarkerElem.onclick = this.saveMarkers.bind(this);

		this.loadMarkerElem = document.getElementById('load-marker');
		this.loadMarkerElem.onclick = this.loadMarkers.bind(this);

		this.clearMarkerElem = document.getElementById('clear-marker');
		this.clearMarkerElem.onclick = this.clearMarkers.bind(this);
	}

	saveMarkers(){
		this.viewer1D.saveMarkers('markers1')	
	}

	clearMarkers(){
		this.viewer1D.clearMarkers('markers1')	
	}

	loadMarkers(){
		this.viewer1D.retreiveMarkers('markers1')	
	}

	handleRoiChange3D(e) {
		if(!this.panel3D)
			return;
		for(let viewer of this.panel3D.viewers) {
			if(viewer.isActive) {
				viewer.modelRenderer.handleRoiChange(e);
			}
		}
	}

	handleLinkLandmarks(e) {
		if(!this.panel3D) {
			this.savedLinkLandmarksEvent = e;
			return;
		}
		this.savedLinkLandmarksEvent = null;
		for(let viewer of this.panel3D.viewers) {
			if(viewer.modelRenderer.mapper) {
				viewer.modelRenderer.mapper.setLandmarks1D(e.detail.landmarks);
			}
		}
	}

	handleToggleFullView1D() {
		this.fullView1D = !this.fullView1D;
		if(this.fullView1D) {
			let pos = Math.round(Math.min(this.container.clientHeight*this.defaultHeightTopPanel1D, this.viewer1D.fullHeight) + splitterWidth);
			this.hSplitter.position(pos);
		} 
		else {
			let h = this.viewer1D.topHalfHeight;
			this.hSplitter.position(h + splitterWidth);
		}
		if(this.panel3D) {
			this.panel3D.redraw();
		}
	}
	
	handleViewerPick(e) {
		let pos = e.detail.position;
		let roi = this.viewer1D.getCurrentRoi();
		this.viewer1D.updateRoi(pos-roi.width/2, e.detail.branch); 
	}
	
}

// =============================================================
class ModelViewer { 
	constructor(container, model, idPrefix, id, hasPicker=true, isThumbnail=false) {
		this.container = container;
		this.model = model;
		this.idPrefix = idPrefix;
		this.id = id;
		this.hasPicker = hasPicker;
		this.isRendererStarted = false;
		this.isThumbnail = isThumbnail;
		this.init();
	}
	
	init() {
		let innerContainer = Utility.addElement(this.container, 'div', `${this.idPrefix}-inner-container-${this.id}`, `viewer-inner-wrapper`);

		this.viewerContainer = Utility.addElement(innerContainer, 'div', `${this.idPrefix}-${this.id}`, `hidden-scroll`);
		this.viewerContainer.style.height = '100%';
		this.viewerContainer.style.width = '100%';

		if (this.model.hasSections) {
			let sectionContainer = Utility.addElement(innerContainer, 'div', `${this.idPrefix}-section-container-${this.id}`, 'hidden-scroll section-container');
			this.section = Utility.addElement(sectionContainer, 'img', `${this.idPrefix}-section-${this.id}`, 'section');
			this.section.setAttribute('alt', 'section');
			this.createSectionSlider(sectionContainer, this.idPrefix + this.id, 60);
			sectionContainer.addEventListener('contextmenu', function(e) {e.preventDefault();}, false); //prevent defult action in Safari
			new ResizeObserver(this.updateSectionMaskSize.bind(this)).observe(this.section);
		}

		this.modelRenderer = (this.model.type == '2D')? new ModelRenderer2D(this.model) : new ModelRenderer3D(this.model);
		this.isActive = true;
		this.visible = true;
		if (this.model.hasSections) {
			this.splitter = $(`#${this.idPrefix}-inner-container-${this.id}`).split({orientation:'vertical', position: '65%', limit: 50});
			this.splitter.containerWidth = this.splitter.width();
		}
		let styleClass = 'hidden-scroll title-bar' + (this.isThumbnail? ' title-bar-thumbnail' : ''); 
		let titleBar = Utility.addElement(this.container, 'div', `${this.idPrefix}-title-${this.id}`, `${styleClass}`);
		titleBar.innerHTML = this.model.name;
		titleBar.addEventListener('click', 	this.handleModelNameClick.bind(this, this.model));

		this.viewModeIcon = Utility.addElement(this.container, 'span', `${this.idPrefix}-controls-${this.id}`, `hidden-scroll view-mode-icon material-icons`);
		this.setViewModeIcon(false)
//		this.controls.innerHTML = `<img src="Icon/maximize.png"/>`
		this.messagePopup = new MessagePopup(this.container);
		this.modelPopup = new ModelPopup(this.container);

	}

	setToggleViewModeHandler(handler) {
		this.viewModeIcon.addEventListener('click', handler);
	}
	
	setViewModeIcon(focused) {
		this.viewModeIcon.innerHTML = focused? 'close_fullscreen' : 'open_in_full';		
	}
	
	createSectionSlider(container, id, value) {
		let sliderBar = Utility.htmlToElem( `<div id="section-slider-wrapper-${id}" class="hidden-scroll slider-bar">
												<div class="slidercontainer">
													<input type="range" min="20" max="100" value="${value}" class="slider" id="section-slider-${id}" >
													<span id="section-slider-value-${id}">${value}</span>
												</div>
									 		 </div>`);
		container.appendChild(sliderBar);
		this.sectionMaskSlider = document.getElementById(`section-slider-${id}`);
		this.sectionMaskSlider.oninput = this.updateSectionMaskSize.bind(this)
		this.sectionMaskValue = document.getElementById(`section-slider-value-${id}`);
	}

	updateSectionMaskSize() {
		let radius = this.sectionMaskSlider.value;
		radius = clamp(radius, 20, 100);
		let d = Math.min(this.section.clientWidth, this.section.clientHeight);
		let r = radius * d / 200;
		this.section.style.clipPath = `circle(${r}px)`;
		this.modelRenderer.setDiscSize(radius);
		this.sectionMaskValue.innerHTML = radius;
	}
	
	startRenderer() {
		this.isRendererStarted = true;;
		this.modelRenderer.init(this.viewerContainer, this.hasPicker, this.section);
		this.modelRenderer.startRenderer();
		if (this.model.hasSections) {
			this.updateSectionMaskSize();
		}
	}

	setRendererStarted(status) {
		this.isRendererStarted = status;	
	}
	
	show() {
		if(this.visible) {
			return;
		}
		this.visible = true;
		this.container.style.display = 'block';
		if(this.splitter && this.splitter.pos) {
			this.splitter.refresh();
			this.splitter.position(this.splitter.pos + '%');
			this.splitter.containerWidth = this.splitter.width();  
		}
		
		this.redrawViewer()
	}
	
	hide() {
		if(!this.visible) {
			return;
		}
		this.visible = false;
		if(this.splitter) {
			this.splitter.pos = this.splitter.position() * 100 / this.splitter.containerWidth;  
		}
		this.container.style.display = 'none';
	}
	
	redrawViewer() {
		if(this.isRendererStarted) {
			this.modelRenderer.redraw();
		}	
		else {
			this.startRenderer();
		}		
	}
	
	handleModelNameClick(model, e) {
		this.modelPopup.open(model, e.target);
	}
	
}

// =============================================================
class Panel3D { 
	constructor(parent, container, models) {
		this.container = container;
		this.models = models;	
		this.ViewModes = Object.freeze({"Multiple": 0, "Focused": 1}); 
		this.viewers = [];
		this.thumbnails = [];
		this.viewMode = this.ViewModes.Multiple;
		this.viewersActiveStatus = []; 
		this.initCompleted = false;
		this.parent = parent;
	}

	init() {
		//********* create viewers container  */
		this.gap = parseInt(getComputedStyle(document.querySelector(':root')).getPropertyValue('--gap-viewer3D')) || 5;
		this.container.style.gap = `${this.gap}px`;
		this.calculateDimensions(this.models.length);
		this.adjustContainer();

		//********* create viewers  */
		for(let k=0; k<this.models.length; k++) {
			let viewerContainer = Utility.addElement(this.container, 'div', `viewer3D-wrapper-${k}`, 'viewer3D-wrapper' );
			let viewer = new ModelViewer(viewerContainer, this.models[k], 'viewer3D', k);
			viewer.setToggleViewModeHandler(this.toggleViewMode.bind(this, k));
//			viewerContainer.onclick = this.handleViewerPanelClick.bind(this, k);
			this.viewers.push(viewer);
		}
		this.adjustViewerPanels();
			
		//********* create thumbnails container  */
		this.thumbnailsContainer = Utility.addElement(this.container.parentNode, 'div', `thumbnails-continer`, 'thumbnails-container' );
//		this.thumbnailsContainer.style.rowGap = `${this.gap}px`;
		let thumbnailHeight = Utility.innerWidth(this.thumbnailsContainer) * .7 + 'px'; 
		this.thumbnailsContainer.style.gridTemplateRows = (this.models.length>1)? `0px repeat(${this.models.length-1}, ${thumbnailHeight}px)` : `${thumbnailHeight}px`;

		//********* thumbnails  */
		for(let k=0; k<this.models.length; k++) {
			let thumbnailContainer = Utility.addElement(this.thumbnailsContainer, 'div', `thumbnail-wrapper-${k}`, 'thumbnail-wrapper' );
			thumbnailContainer.style.height = thumbnailHeight; 
			let thumbnail = new ModelViewer(thumbnailContainer, this.models[k], 'thumbnail', k, false, true);
			thumbnail.setToggleViewModeHandler(this.toggleThumbnailViewMode.bind(this, k));
//			thumbnailContainer.onclick = this.handleThumbnailClick.bind(this, k);
			this.thumbnails.push(thumbnail);
		}
		this.thumbnailsContainer.scrollTop = 0;
		this.adjustThumbnailContainer();

//		new ResizeObserver(this.resize.bind(this)).observe(this.container);
		this.redraw();
		
		this.createModelSelectionSidebar();
	}

	adjustThumbnailContainer(index) {
		if(!this.thumbnails || this.thumbnails.length == 0 || this.viewers.length < 2) {
			return;
		}
	
		if (this.viewMode === this.ViewModes.Focused) {
			this.container.style.width = '80%';
			for(let k=0; k<this.viewers.length; k++) {	//to avoid problem with vertical scroll bar				
				if (k != index) {
					this.thumbnails[k].container.style.display = 'block';
				}
			}
			this.thumbnailsContainer.style.display = 'grid';
		}
		else {
			this.hideThumbnails();
		}
	}
	
	redrawThumbnails(index) {
		if(!this.thumbnails || this.thumbnails.length == 0 || this.viewers.length < 2) {
			return;
		}
		if (this.viewMode === this.ViewModes.Focused) {
			this.setFocusedThumbnail(index);
			for(let k=0; k<this.viewers.length; k++) {
				if (k != index) {
					this.thumbnails[k].show();
				}
			}
		}
		
	}

	hideThumbnails() {
		this.container.style.width = '100%';//'calc(100% - 2 * var(--gap-viewer3D))';
		this.thumbnailsContainer.style.display = 'none';
		for(let thumbnail of this.thumbnails) {
			thumbnail.hide();
		}
	}

	setFocusedThumbnail(index) {
		if(this.thumbnails && this.thumbnails.length > 0) { 
			this.thumbnails[index].hide();
			let r = 2;
			for(let k=0; k<this.thumbnails.length; k++) {
				if ( k != index) {
					this.thumbnails[k].container.style.gridRow = `${r++}`;
				}
			}
			this.thumbnails[index].container.style.gridRow = '1';
			if ((this.focusedViewer != null || this.focusedViewer != undefined) && this.focusedViewer != index) {
				this.thumbnails[this.focusedViewer].show();
				this.thumbnails[this.focusedViewer].redrawViewer();
			}
		}		
		this.focusedViewer = index;
	}

	handleThumbnailClick(index, e) {
		if(!e.ctrlKey) 
			return;
		this.toggleThumbnailViewMode(index);
	}
	
	toggleThumbnailViewMode(index) { // change to/from focused mode - "index" specifies index of the focused viewer 
		this.viewers[this.focusedViewer].hide();
		this.viewers[this.focusedViewer].isActive = false;
		this.viewers[this.focusedViewer].setViewModeIcon(false);
//		let roi = this.viewers[this.focusedViewer].modelRenderer.roi;
		this.setFocusedThumbnail(index);
		this.viewers[this.focusedViewer].show();
		this.viewers[this.focusedViewer].isActive = true;
		this.viewers[this.focusedViewer].setViewModeIcon(true);
		this.viewers[this.focusedViewer].redrawViewer();
		//		this.viewers[this.focusedViewer].modelRenderer.updateRenderer(roi);
		this.viewers[this.focusedViewer].modelRenderer.updateRenderer();
		if (this.viewers[this.focusedViewer].splitter) {
			this.viewers[this.focusedViewer].splitter.refresh();
		}
	}

	handleViewerPanelClick(index, e) {
		if(!e.ctrlKey) 
			return;
		
		this.toggleViewMode(index);
	}
	
	toggleViewMode(index) { // change to/from focused mode - "index" specifies index of the focused viewer 
		if(this.viewMode === this.ViewModes.Focused) {
			this.viewers[index].setViewModeIcon(false);
			this.viewMode = this.ViewModes.Multiple;
		}
		else {
			this.viewers[index].setViewModeIcon(true);
			this.viewMode = this.ViewModes.Focused;
		}
//		this.viewMode = (this.viewMode === this.ViewModes.Focused) ? this.ViewModes.Multiple : this.ViewModes.Focused;
		this.sidebar.setActive(this.viewMode !== this.ViewModes.Focused);
		for (let k = 0; k < this.viewers.length; k++) {
			if (this.viewMode === this.ViewModes.Focused) {
				this.viewersActiveStatus[k] = this.viewers[k].isActive;
				this.viewers[k].isActive = (k == index);
			}
			else {
				this.viewers[k].isActive = this.viewersActiveStatus[k];
			}
		}
		this.adjustThumbnailContainer(index);
		this.redraw();
		this.redrawThumbnails(index);
	}

	createModelSelectionSidebar() {
		let k = 0;
		let content = `<div class="viewer3d-selection"> <br><br>
							<table style="border:none; text-align:left">
								<tr><td colspan="2" id="select-all-models">Select All</td></tr>`;
		for(let model of this.models) {
			content += `<tr style="height:40px">
							<td><input type="checkbox" id="select-model3D-${k}" name="select-model3D" ${this.viewers[k].isActive?"checked":""}></td>
							<td><label for="select-model3D-${k}"> ${model.name}</label></td>
						</tr>`
			k++;
		}
		content += `</table><br>
					<input type="button" id="update-model-selection" width="40px" value="Update">
					<input type="button" id="cancel-model-selection" value="Cancel">
					</div>`;

		this.sidebar = new Sidebar(this.container, 'left', 'model-selection-sidebar', content, 300);
		this.sidebar.setOnopen(this.checkActiveViewers.bind(this));
		this.sidebar.setOnclose(this.checkActiveViewers.bind(this));
		let selectAll = document.getElementById('select-all-models');
		selectAll.onclick = this.selectAllViewers.bind(this);
		let updateButton = document.getElementById('update-model-selection');
		updateButton.onclick = this.updateActiveViewers.bind(this);
		let cancelButton = document.getElementById('cancel-model-selection');
		cancelButton.onclick = () => {	this.sidebar.close(true); }
	}

	checkActiveViewers() {
		for(let k=0; k<this.models.length; k++) {
			document.getElementById(`select-model3D-${k}`).checked = this.viewers[k].isActive;
		}
	}
	
	selectAllViewers() {
		let checkboxes = document.getElementsByName('select-model3D');
		for(let checkbox of checkboxes) {
			checkbox.checked = 'checked';
		}		
	}
	
	updateActiveViewers(e) {
		if (this.viewMode == this.ViewModes.Focused) {
			this.hideThumbnails();
			this.viewMode = this.ViewModes.Multiple;
		}
		
		let selections = [];
		let anySelected = false;
		for(let k=0; k<this.models.length; k++) {
			selections[k] = document.getElementById(`select-model3D-${k}`).checked;
			anySelected ||= selections[k];
		}

		if(!anySelected) {
			this.sidebar.hold();
			this.parent.messagePopup.open("At least one viewer must be selected!", e.target, this.sidebar.unhold.bind(this.sidebar));
			return;
		}
		for(let k=0; k<this.models.length; k++) {
			this.viewers[k].isActive = document.getElementById(`select-model3D-${k}`).checked;
		}
		this.sidebar.close();
		this.redraw();
	}
	
	calculateDimensions(n) {	//calcualates number of rows & columns
		if (!n) {
			n = this.getActiveViewersNum();
		}
		let f = .65;
		let d1 = Math.min(this.container.clientHeight, this.container.clientWidth*f);
		let d2 = Math.max(this.container.clientHeight, this.container.clientWidth*f);
		let a = d2 / d1;
		let r = 1;
		switch(n) {
			
			case 0: 
			case 1: 
			case 2: r = 1; break;
			case 3: //(a <= 2)? r = 2 : r = 1; break;
			case 4: 
			case 5: (a <= 2)? r = 2 : r = 1; break;
			case 6: 
			case 7: (a < 1.5)? r = 3 : (r <= 4)? r = 2 : r = 1; break;
			case 8: (a <= 1.5)? r = 3 : (r <= 5)? r = 2 : r = 1; break;
			default: (a <= 2)? r = 3 : r = 2;
		}
		let c = Math.ceil(n / r);
		let changeFlag = false;
		if (this.container.clientHeight <= this.container.clientWidth) {
			changeFlag = (this.rows != r || this.cols != c); 
			this.rows = r;
			this.cols = c;
		}
		else {
			changeFlag = (this.rows != c || this.cols != r); 
			this.rows = c;
			this.cols = r;
		}
		
		return changeFlag;
	}
	
	adjustContainer() {
		let {height, width} = Utility.innerDimensions(this.container);
		if (this.viewMode === this.ViewModes.Focused) {
			width += this.gap; 
		}
		height -= splitterWidth;
		let w = (width - this.gap * this.cols) / this.cols - 1;
		let h = (height - this.gap * this.rows) / this.rows;
//		let w = (this.container.clientWidth - this.gap * this.cols) / this.cols ;
//		let h = (this.container.clientHeight - this.gap * this.rows) / this.rows;	
		this.container.style.gridTemplateColumns = (this.cols>1)? `repeat(${this.cols}, ${w}px)` : `${w}px`;
		this.container.style.gridTemplateRows = (this.rows>1)? `repeat(${this.rows}, ${h}px)` : `${h}px`;
	}

	adjustViewerPanels() {
		let k=0;
		for(let viewer of this.viewers) {
			if (viewer.isActive) {
				let i = Math.floor(k / this.cols);
				let j = k % this.cols; 
				viewer.container.style.gridColumn =`${j+1}`;
				viewer.container.style.gridRow = `${i+1}`;
				viewer.show();
				k++;
			}
			else {
				viewer.container.style.gridColumn = '1';
				viewer.container.style.gridRow = '1';
				viewer.hide();
			}
		}
	}

	adjustSections() {
		let k=0;
		for(let viewer of this.viewers) {
			if (viewer.isActive && this.models[k].hasSections) {
				let splitterPos = viewer.splitter.position();
				let ww = viewer.splitter.containerWidth;
				let percent = Math.round(splitterPos * 100 / ww)
//console.log(`k=${k}  pos= ${splitterPos} savedPos=${viewer.splitterPos}  ww=${ww}   new width= ${viewer.splitter.width()}  pp=${percent}%` );				
				viewer.splitter.containerWidth = viewer.splitter.width();
				viewer.splitter.refresh();
				viewer.splitter.position(`${percent}%`);
			}
			k++;
		}
	}

	redraw(dimensionChanged=null) {
//		console.log('3D redraw');		
		dimensionChanged = this.calculateDimensions();
		this.adjustContainer();
		this.adjustViewerPanels();
		this.adjustSections();
		if (dimensionChanged || !this.initCompleted) {
			this.redrawViewers();
		}
	}

	resize() {
//		console.log('3D resize');		
		this.redraw(true);
	}
	
	redrawViewers() {
// console.log("===> in redraw Viewers 3D");
		for(let viewer of this.viewers) {
			if(viewer.isActive)
				viewer.redrawViewer();
		}
		if (!this.initCompleted) {
			this.initCompleted = true;
		}
	}
	
	getActiveViewersNum() {
		let n = 0;
		for(let viewer of this.viewers) {
			if (viewer.isActive) {
				n++;
			}
		}
		return n;
	}
	
	setViewersPickListener(listener) {
		for(let viewer of this.viewers) {
			viewer.modelRenderer.pickEventListener = listener;
		}
	}
}

