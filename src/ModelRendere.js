export { ModelRenderer2D, ModelRenderer3D} 

// =============================================================
class ModelRenderer {
	constructor(model) {
		this.model = model;
		this.sectionView = model.hasSections || false; 
		this.isActive = false;
		// Create a mapper to link to 1D
		this.mapper = new ViewerMapper();
		this.mapper.setLandmarks3D(model.config.landmarks);
	}

	initRenderer(renderer, sectionImage=null) {
		if (this.sectionView) { 
			this.sectionImage = sectionImage;
		}
		this.renderer = renderer;
		this.renderer.init(this.model.config);
  		this.renderer.loadModels();		
	}		

	updateRenderer(roi=null) {
		if(roi && this.roi &&		// no change detected
			roi.start.isEqual(this.roi.start) && 
			roi.end.isEqual(this.roi.end) &&
			(!this.position || this.position.startLandmark == null || relativePos.startLandmark == null || 
				this.position.endLandmark == null || relativePos.endLandmark == null) && 
			roi.position.isEqual(this.roi.position) ) {
			return;
		}
		if (roi) {
			this.roi = roi;
		}
		if(!this.roi) {
			return;
		}			
		
		if( !( this.pathExist(this.roi.start.startLandmark.paths) &&
				this.pathExist(this.roi.start.endLandmark.paths) &&
				this.pathExist(this.roi.end.startLandmark.paths) &&
				this.pathExist(this.roi.end.endLandmark.paths) &&
				this.pathExist(this.roi.position.startLandmark.paths) &&
				this.pathExist(this.roi.position.endLandmark.paths) )) {
			return;
		}
			
		this.renderer.setPosition(this.roi.position.startLandmark.id, this.roi.position.endLandmark.id, this.roi.position.position,
								  this.roi.start.startLandmark.id, this.roi.start.endLandmark.id, this.roi.start.position,
								  this.roi.end.startLandmark.id, this.roi.end.endLandmark.id, this.roi.end.position);
		if(this.sectionImage) {
			this.sectionImage.src = this.renderer.getSectionImage();
		}
	}

	pathExist(paths) {
		for(let path of paths) {
			if(!this.model.config.paths.find(p => p.id == path)) {
				return false;
			}
		} 
		return true;
	}

	handleRoiChange(e) {
		if(!this.mapper.active()){
			return;
		}
		let start = this.mapper.getPos3D(e.detail.pos + e.detail.offset, e.detail.branch);
		let end = this.mapper.getPos3D(e.detail.pos + e.detail.offset + e.detail.width, e.detail.branch);
		if(!start || !end) {
			return
		}
		let sectionPos = e.detail.cursorPos
		if (sectionPos === undefined) {
			sectionPos = e.detail.pos + e.detail.width/2;
		} 
		let pos3D = this.mapper.getPos3D(sectionPos + e.detail.offset, e.detail.branch);
		if (!pos3D) {
			console.log('Mapping from 1D position : ' + (sectionPos + e.detail.offset) + ' branch: ' + e.detail.branch + ' into 3D is null!');
			return;
		}
		
		let roi = {	start:	new RelativePosition(start.startLandmark, start.endLandmark, start.position), 
					end: 	new RelativePosition(end.startLandmark, end.endLandmark, end.position),
					position:new RelativePosition(pos3D.startLandmark, pos3D.endLandmark, pos3D.position)};

		this.updateRenderer(roi);
	}
	
	initRoi() {
		
		let lmk0 = this.model.config.landmarks[0];
		let lmk1 = null;
		for(let landmark of this.model.config. landmarks) {
			if (landmark.position[0] > lmk0.position[0] && landmark.paths[0] == lmk0.paths[0]) {
				if (!lmk1 || lmk1.position[0]>landmark.position[0])
					lmk1 = landmark;
			}
		}
		if(!lmk0 || !lmk1) {
			return
		}
		
		let roi = { start:	new RelativePosition(lmk0, lmk1, 0.495),
					end: 	new RelativePosition(lmk0, lmk1, 0.505),
					position:new RelativePosition(lmk0, lmk1, 0.500) };
		this.updateRenderer(roi);
	}
	
	handleModelPickEvent(positions, sensitivity=20) {
		for (let pos of positions) {
			let clickedPos = this.renderer.positionToPath(pos, sensitivity);
			if (!clickedPos) {
//				console.log("3D click ===> positionToPath NULL!		model:" + this.model.name + "	pos:" + pos);
				continue;
			}
	
			let lmks = this.findSurrondingLandmarks(clickedPos);
			if(!lmks || lmks.length < 2) {
				console.log('handleModelPickEvent, findSurrondingLandmarks failed!');
				return null;
			}
			let offset = (clickedPos[1] - lmks[0].position[0]) / (lmks[1].position - lmks[0].position)
	
			let pos1D = this.mapper.getPos1D(lmks[0], lmks[1], offset);
			if (!pos1D) {
				console.log("clicked pos mapped to null: " + offset + "% between " + lmks[0] + " , " + lmks[1]);
				return clickedPos;
			}
			
			if (this.pickEventListener) {
				let e = new CustomEvent('3D_model_pick', {cancelable: true, detail: {position: pos1D.position, branch: pos1D.branch}});
				this.pickEventListener.dispatchEvent(e);
			}
			return clickedPos;
		}
		return null;
	}

	findSurrondingLandmarks(pos) {
		let lmks = []; 
		let d1 = -1; 
		let d2 = Number.MAX_VALUE;
		let path = this.model.config.paths[pos[0]].id
		for(let landmark of this.model.config.landmarks) {
			if (landmark.paths.includes(path)) {
				if(landmark.position[0] <= pos[1] && landmark.position[0] > d1 && !this.mapper.isPil(landmark)) {
					lmks[0] = landmark;
					d1 = landmark.position[0];
				}
				if(landmark.position[0] >= pos[1] && landmark.position[0] < d2 ) {
					lmks[1] = landmark;
					d2 = landmark.position[0];
				}
			}
		}
		
		return lmks;
	}

}

// =============================================================
class ModelRenderer2D extends ModelRenderer {

	constructor(model) {
		super(model)
//		this.first_update = true;
	}

	init(container, hasPicker = true) {
//		let renderer = new GCA2DRenderer(window, container, this.updateRenderer.bind(this), hasPicker? this.picker.bind(this) : undefined);
		let renderer = new GCA2DRenderer(window, container, this.rendererReady.bind(this), hasPicker? this.picker.bind(this) : undefined);
		this.initRenderer(renderer);
	}

	rendererReady(){
		this.isActive = true;
		this.initRoi();
	}

	startRenderer() {
//		this.isActive = true;
//		this.renderer.setView();
//		this.initRoi();
	}

	redraw() {
		this.renderer._onResize();
	}
	

	picker = function(ren, pos) {
		const tol = 20.0;
		this.handleModelPickEvent([pos], tol*tol)
	}
}


//************************************************************************************************* */

class ModelRenderer3D extends ModelRenderer {
	constructor(model) {
		super(model)
	}
		
	init(container3D, hasPicker=true, sectionImage=null) {
		
		let renderer = new GCA3DRenderer(window, container3D, hasPicker? this.picker.bind(this) : null);

renderer.loadModels = renderer.addModels;   // This should be removed when using same name in 2D & 3D renderer

		this.initRenderer(renderer, sectionImage);
	}
		

	startRenderer() {
		this.isActive = true;
		this.renderer.setView();
		this.initRoi();
		this.renderer.animate();
	}

	redraw() {
		this.renderer._ren._windowResize();
	}
	
	setDiscSize(radius) {
		this.discRad = radius;
		if(this.renderer) {
			this.renderer.setDiscRadius(this.discRad);
		}
	}

	// Recieve pick events from GCA3DRenderer
	picker(ev, obj, typ, nam, pos) {
/*			
		if(typ === 'path') {
			let col = Math.floor((Math.random() * 0xfffffff));
			this.renderer.addMarker(markerIdx.toString(), pos, col, this.markerIdx.toString())
			++this.markerIdx;
		} else if(typ === 'mrkm') {
			this.renderer.removeMarker(nam);
		}
*/	
// console.log("3D click ===> type: "  + typ[0] + "	model:" + this.model.name + "	pos:" + pos);

		let clickedPos = [];
		let p = typ.indexOf('path')
		if (p >= 0) {
			clickedPos.push(Array.isArray(pos[p])? pos[p] : [pos[p].x, pos[p].y, pos[p].z]);
		}
		p = typ.indexOf('ana')
		if ( p >= 0) {
			clickedPos.push(Array.isArray(pos[p])? pos[p] : [pos[p].x, pos[p].y, pos[p].z]);
		}			
		if(clickedPos.length > 0) {
			this.handleModelPickEvent(clickedPos, 20);
		}
	}

}

// =============================================================
class RelativePosition {
	constructor(start, end , pos) {
		this.startLandmark = start;
		this.endLandmark = end,
		this.position = pos;
	}
	
	isEqual(relativePos) {
		return (this.startLandmark.id === relativePos.startLandmark.id) && 
				(this.endLandmark.id === relativePos.endLandmark.id) && 
				(this.position === relativePos.position) ;
		
	}
} 



// =============================================================
class ViewerMapper {

	constructor(landmarks3D=null, landmarks1D=null) {
		this.landmarks3D = landmarks3D? [...landmarks3D] : landmarks3D;

		this.landmarks1D = landmarks1D? [...landmarks1D] : landmarks1D;
							
		this.commonLandmarks = new Set();
		this.mapLandmarks();
		this.mapByName = false;
		this.isMapped = false;

	} 
	
	setLandmarks1D(landmarks) {
		this.mainMax = 0;
		this.extMin = Number.MAX_SAFE_INTEGER;
		for(let landmark of landmarks) {
			if(landmark.branch == 0 && landmark.position > this.mainMax) {
				this.mainMax = landmark.position;
			}
			if(landmark.branch == 1 && landmark.position < this.extMin) {
				this.extMin = landmark.position;
			}
		}
		this.landmarks1D = landmarks.sort((a, b) => (a.position == b.position)? ((a.branch==0)? ((b.branch==0)?0:1):-1): a.position - b.position);
		this.mapLandmarks();
	}
	
	setLandmarks3D(landmarks) {
		this.landmarks3D = landmarks? [...landmarks] : landmarks;
		this.mapLandmarks();			// Parse the text
	}
	
	getLandmark3D(landmark1D) {
		if(landmark1D == null) 
			return null;
			
		let anatomyLandmark1D = Array.isArray(landmark1D.anatomy)? landmark1D.anatomy[0] : landmark1D.anatomy;
			
		if(anatomyLandmark1D == null) 
			return null;
		
		for(let landmark of this.landmarks3D) {
			if(this.mapByName) {
				let name = landmark.anatomy[0].abbreviated_name;
				if(name.toUpperCase() === anatomyLandmark1D.abbreviated_name.toUpperCase())
					return landmark;
			}
			else {
				if(landmark.anatomy[0].id.toUpperCase() === anatomyLandmark1D.id.toUpperCase())
					return landmark;
			}
		}
		return null;
	}

	active() {
		if(this.iMapped) {
			return true;
		}
		this.mapLandmarks();
		return this.isMapped;// (this.landmarks1D && this.landmarks3D);
	}
	
	mapLandmarks() {
		if (!this.landmarks1D || !this.landmarks3D)
			return;
			
		this.landmarks1D.sort((a, b) => (a.position == b.position)? ((a.branch==0)? ((b.branch==0)?0:1):-1): a.position - b.position);
		this.landmarks3D.sort((a, b) => (a.paths[0] == b.paths[0])? a.position[0] - b.position[0] : a.paths[0] - b.paths[0] );
		this.mappingRate = []
		let firstLandmarks1D = [];
		let lastLandmarks1D = [];
		this.firstLandmarks1D = [];
		this.lastLandmarks1D = [];
		this.firstLandmarks3D = [];
		this.lastLandmarks3D = [];

		for(let landmark1D of this.landmarks1D) {
			let landmark3D = this.getLandmark3D(landmark1D)
			if(landmark3D != null) {
				let commonId = this.mapByName? landmark3D.anatomy[0].abbreviated_name.toUpperCase() : landmark3D.anatomy[0].id.toUpperCase()
				this.commonLandmarks.add(commonId)
				if(!this.firstLandmarks3D[landmark3D.paths[0]]) {
					this.firstLandmarks3D[landmark3D.paths[0]] = landmark3D;
					firstLandmarks1D[landmark3D.paths[0]] = landmark1D;
				}
				if(!this.isPil(landmark3D)){ 
					this.lastLandmarks3D[landmark3D.paths[0]] = landmark3D;
					lastLandmarks1D[landmark3D.paths[0]] = landmark1D;
				}
				else {
					this.pilLandmarks3D = landmark3D;	
				}
			}
			if(!this.firstLandmarks1D[landmark1D.branch]) {
				this.firstLandmarks1D[landmark1D.branch] = landmark1D;
			}
			if(!this.isPil(landmark1D)){ 
				this.lastLandmarks1D[landmark1D.branch] = landmark1D;
			}
			else {
				this.pilLandmarks1D = landmark1D;
			}
				
		}
		for(let path in this.lastLandmarks3D) {
			if(this.firstLandmarks3D[path] && this.lastLandmarks3D[path]) {
				this.mappingRate[path] = (this.lastLandmarks3D[path].position - this.firstLandmarks3D[path].position) /
									(lastLandmarks1D[path].position - firstLandmarks1D[path].position)	 
			} 
		}
		this.isMapped = true;
	}

	adjustLandmarks1D(startLmk, endLmk) {   //find closest landmarks that are common between two models(e.g. 1D & 3D)
		if (this.isPil(startLmk)) {
			startLmk = this.lastLandmarks1D[startLmk.branch]
		}
		return this.adjustLandmarks(startLmk, endLmk, this.landmarks1D);
	}

	adjustLandmarks3D(startLmk, endLmk) {   //find closest landmarks that are common between two models(e.g. 1D & 3D)
		if (this.isPil(startLmk)) {
			startLmk = this.lastLandmarks3D[startLmk.paths[0]]
		}
		return this.adjustLandmarks(startLmk, endLmk, this.landmarks3D);
	}

	adjustLandmarks(startLmk, endLmk, landmarks) {   //find closest landmarks that are common between two models(e.g. 1D & 3D)
		let commonId = this.mapByName? startLmk.anatomy[0].abbreviated_name.toUpperCase() : startLmk.anatomy[0].id.toUpperCase()
		if (!this.commonLandmarks.has(commonId)) {
			let i = landmarks.findIndex(x=> x==startLmk)
			for( ; i>=0; i--) {
				commonId = this.mapByName? landmarks[i].anatomy[0].abbreviated_name.toUpperCase() : landmarks[i].anatomy[0].id.toUpperCase()
				if(this.commonLandmarks.has(commonId) && landmarks[i].branch == startLmk.branch) {
					startLmk = landmarks[i];
					break;
				}
			}
		}
		if(!endLmk.anatomy) {
			return [startLmk, null]
		}
		commonId = this.mapByName? endLmk.anatomy[0].abbreviated_name.toUpperCase() : endLmk.anatomy[0].id.toUpperCase()
		if (!this.commonLandmarks.has(commonId)) {
			let i = landmarks.findIndex(x=> x==endLmk)
			for( ; i<landmarks.length; i++) {
				commonId = this.mapByName? landmarks[i].anatomy[0].abbreviated_name.toUpperCase() : landmarks[i].anatomy[0].id.toUpperCase()
				if(this.commonLandmarks.has(commonId) && landmarks[i].branch == endLmk.branch) {
					endLmk = landmarks[i];
					return [startLmk, endLmk]
				}
			}
			return [startLmk, null]
		}
		return [startLmk, endLmk]
	}
	
	getPos3D(pos, branch=null) {
		let landmarks = this.findLandmarks(pos, branch);
		if(!landmarks || landmarks.length == 0 || landmarks[0] == null || landmarks[1] == null) {
			return null;
		}
		landmarks = this.adjustLandmarks1D(landmarks[0], landmarks[1])
		let startLandmark = this.getLandmark3D(landmarks[0]);
		let endLandmark = this.getLandmark3D(landmarks[1]);
	
		let pos3D = 0;	
		if(endLandmark == null || this.isPil(endLandmark)) {
			if(!startLandmark || !this.mappingRate[startLandmark.paths[0]]) {
				return null;
			}
			pos3D = (pos - landmarks[0].position) * this.mappingRate[startLandmark.paths[0]];  
			endLandmark = this.pilLandmarks3D;
			if(!endLandmark) {
				return null;
			}
			pos3D = (pos3D == 0)? 0 : pos3D / (endLandmark.position - startLandmark.position);
			
/*			
			for(let i=this.landmarks3D.length-1; i>=0; i-- ) {
				if(this.landmarks3D[i].paths[0] == startLandmark.paths[0]) {
					endLandmark = this.landmarks3D[i];
					pos3D = pos3D / (endLandmark.position - startLandmark.position);
					break;
				} 
			}
*/			
		}	
		else {	
			let width = landmarks[1].position - landmarks[0].position;
			pos3D = (width > 0)? (pos - landmarks[0].position) / width : 0;
		}
		
		return new RelativePosition(startLandmark, endLandmark, pos3D);
	}

	
	getPos1D(lmk0, lmk1, pos) {
		let landmarks = (lmk0.position[0] < lmk1.position[0])? [lmk0, lmk1] : [lmk1, lmk0];

		landmarks = this.adjustLandmarks3D(landmarks[0], landmarks[1])
		let startLandmark = this.getLandmark1D(landmarks[0]);
		let endLandmark = this.getLandmark1D(landmarks[1]);

 		if(!startLandmark || !endLandmark) {
			console.log("No matching landmark for " + lmk0 + " and/or " + lmk1);
			return null;
		}
		let start = startLandmark.position - this.firstLandmarks1D[startLandmark.branch].position; 
		let offset = pos 
		if(this.isPil(endLandmark)) {
			offset *= (landmarks[1].position[0] - landmarks[0].position[0]) / this.mappingRate[landmarks[0].paths[0]]					
		}
		else {
			offset *= (endLandmark.position - startLandmark.position);
		}
		if(startLandmark.position + offset > this.pilLandmarks1D.position) { //beyond 1D model PIL
			return null;
		} 
		return {position: start + offset, branch: startLandmark.branch};
	}

	getLandmark1D(landmark) {
		if(!this.landmarks1D)
			return null;
		if(this.mapByName) {
			return this.landmarks1D.find(lmk => lmk.anatomy[0].abbreviated_name.toUpperCase() === landmark.anatomy[0].abbreviated_name.toUpperCase());
		}
		else {
			return this.landmarks1D.find(lmk => lmk.anatomy[0].id.toUpperCase() === landmark.anatomy[0].id.toUpperCase());
		}
	}
	
	// finds two 1D landmarks surronding the given 1D landmark
	findLandmarks(pos, branch) {
		let start = null;
		let end = null;
		let m1 = 0;
		let m2 = 0;
		let status = 2; // both branches
		if (pos < this.extMin || pos <= this.mainMax && branch == 0) {
			status = 0;
		}
		if (branch == 1 || pos > this.mainMax || pos >= this.extMin && branch == 2) {
			status = 1;
		}

		let extFlag = false;
		for(let landmark of this.landmarks1D) {
			if (!extFlag && landmark.branch == 1) {
				extFlag = true;
			}
			if(status !== landmark.branch || status == 2 && extFlag && landmark.branch == 0) { 
				continue;
			}
			if(pos >= landmark.position && (start == null || pos - landmark.position < m1)) {
				start = landmark;
				m1 = pos - landmark.position;
			}
			if(landmark.position >= pos && (end == null || landmark.position - pos < m2)) {
				end = landmark;
				m2 = landmark.position - pos;
			}
		}
		return [start, end];
	}
	
	isPil(landmark) {
		if(!landmark) {
			return false;
		}
		if(landmark.anatomy[0].id == 'GUT_ATLAS_ANA:1012' || 
		   landmark.anatomy[0].abbreviated_name =='PIL' ) {
			return true;
		} 
		return false;
	}
}


