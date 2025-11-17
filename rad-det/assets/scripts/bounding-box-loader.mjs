import {
    Script,
    Entity,
    StandardMaterial,
    Color,
    Vec3,
    Layer,
} from 'playcanvas';

class BoundingBoxLoader extends Script {
    static scriptName = 'boundingBoxLoader';
    
    static boundingBoxLayer = null;

    static attributes = {
        jsonUrl: { 
            type: 'string', 
            default: 'assets/box_data/apartment_rad_det_boxes.json', 
            title: 'JSON URL' 
        },
        showLabels: {
            type: 'boolean',
            default: true,
            title: 'Show Labels'
        },
        autoLoad: {
            type: 'boolean',
            default: true,
            title: 'Auto Load on Start'
        }
    };

    initialize() {
        this.boxes = [];
        this.boxEntities = [];
        
        // Create a custom layer for bounding boxes (similar to annotations)
        if (!BoundingBoxLoader.boundingBoxLayer) {
            const layer = new Layer({
                name: 'BoundingBoxes'
            });
            const worldLayer = this.app.scene.layers.getLayerByName('World');
            const idx = this.app.scene.layers.getTransparentIndex(worldLayer);
            this.app.scene.layers.insert(layer, idx + 1);
            BoundingBoxLoader.boundingBoxLayer = layer;
            
            // Add layer to camera
            const camera = this.app.root.findComponent('camera');
            if (camera) {
                camera.layers = [...camera.layers, layer.id];
            }
        }
        
        // Set up mouse click handler for bounding box interaction
        this.setupMouseClickHandler();
        
        // Expose methods globally for scene switching
        window.loadBoundingBoxesForScene = (sceneId) => {
            const urls = {
                'apartment': 'assets/box_data/apartment_rad_det_boxes.json',
                'office': 'assets/box_data/saffraan_rad_det_boxes.json',
            };
            
            if (urls[sceneId]) {
                this.jsonUrl = urls[sceneId];
                this.loadBoundingBoxes();
            } else {
                // Clear boxes for scenes without data
                console.warn('No bounding boxes defined for scene:', sceneId);
                this.clearBoxes();
            }
        };

        window.clearBoundingBoxes = () => {
            this.clearBoxes();
        };
        
        window.showAllBoundingBoxes = () => {
            this.showAllBoxes();
        };
        
        window.hideBoundingBoxes = () => {
            this.hideAllBoxes();
        };
    }
    
    setupMouseClickHandler() {
        // Use mouse input for click detection
        this.app.mouse.on('mousedown', (event) => {
            if (event.button !== 0) return; // Only left clicks
            
            // Check if click is on a UI button or UI element - prioritize UI over bounding boxes
            const clickTarget = event.event?.target || document.elementFromPoint(event.x, event.y);
            if (clickTarget && (
                clickTarget.tagName === 'BUTTON' ||
                clickTarget.closest('button') ||
                clickTarget.closest('#scene-header') ||
                clickTarget.closest('#info-button') ||
                clickTarget.closest('#home-button') ||
                clickTarget.closest('#fullscreen-button') ||
                clickTarget.closest('#reset-button') ||
                clickTarget.closest('#bbox-toggle-button') ||
                clickTarget.closest('#scene-selector-button') ||
                clickTarget.closest('#info-panel') ||
                clickTarget.closest('#scene-selector-modal')
            )) {
                return; // Skip bounding box interaction if clicking on UI
            }
            
            // Skip if no boxes loaded yet
            if (!this.boxEntities || this.boxEntities.length === 0) return;
            
            const camera = this.app.root.findComponent('camera');
            if (!camera) return;
            
            // Convert screen coordinates to camera space
            const canvas = this.app.graphicsDevice.canvas;
            const rect = canvas.getBoundingClientRect();
            const x = event.x - rect.left;
            const y = event.y - rect.top;
            
            // Create ray from camera through mouse position using camera.screenToWorld
            const cameraEntity = camera.entity;
            const from = cameraEntity.getPosition().clone();
            
            // screenToWorld needs a Vec3 to write the result into
            const worldPos = new Vec3();
            camera.screenToWorld(x, y, camera.farClip, worldPos);
            
            // Check if worldPos is valid
            if (!worldPos || !worldPos.x) {
                console.warn('screenToWorld returned invalid position');
                return;
            }
            
            const direction = new Vec3().sub2(worldPos, from).normalize();
            
            // Check for intersection with any bounding box collision meshes
            let closestDistance = Infinity;
            let closestBox = null;
            
            for (const boxEntity of this.boxEntities) {
                // Skip disabled boxes (hidden ones)
                if (!boxEntity.enabled) continue;
                
                const collisionBox = boxEntity.findByName('collision-box');
                if (!collisionBox || !collisionBox.render || !collisionBox.render.enabled) continue;
                
                // Use custom ray-box intersection instead of AABB method
                const result = this.rayBoxIntersect(from, direction, collisionBox);
                if (result !== null && result < closestDistance) {
                    closestDistance = result;
                    closestBox = collisionBox;
                }
            }
            
            if (closestBox && closestBox.boxData) {
                this.onBoundingBoxClick(closestBox.boxData);
                
                // Set a flag to prevent the document click handler from closing the panel
                window._boundingBoxClicked = true;
                setTimeout(() => {
                    window._boundingBoxClicked = false;
                }, 100);
            }
        });
        
        // Add hover effect
        this.app.mouse.on('mousemove', (event) => {
            // Skip if no boxes loaded yet
            if (!this.boxEntities || this.boxEntities.length === 0) return;
            
            const camera = this.app.root.findComponent('camera');
            if (!camera) return;
            
            const canvas = this.app.graphicsDevice.canvas;
            const rect = canvas.getBoundingClientRect();
            const x = event.x - rect.left;
            const y = event.y - rect.top;
            
            const cameraEntity = camera.entity;
            const from = cameraEntity.getPosition().clone();
            
            // screenToWorld needs a Vec3 to write the result into
            const worldPos = new Vec3();
            camera.screenToWorld(x, y, camera.farClip, worldPos);
            
            // Check if worldPos is valid
            if (!worldPos || worldPos.x === undefined) {
                return;
            }
            
            const direction = new Vec3().sub2(worldPos, from).normalize();
            
            // Check if hovering over any bounding box
            let isHovering = false;
            for (const boxEntity of this.boxEntities) {
                // Skip disabled boxes (hidden ones)
                if (!boxEntity.enabled) continue;
                
                const collisionBox = boxEntity.findByName('collision-box');
                if (!collisionBox || !collisionBox.render) continue;
                
                // Use custom ray-box intersection
                if (this.rayBoxIntersect(from, direction, collisionBox) !== null) {
                    isHovering = true;
                    break;
                }
            }
            if (isHovering) {
                document.body.style.cursor = 'pointer';
            } else {
                document.body.style.cursor = 'default';
            }
        });
    }
    
    onBoundingBoxClick(boxData) {
        // Handle box click without noisy logging
        // Hide all other boxes
        this.setActiveBox(boxData.id);
        
        // Store the box data for the "Go to Object" button
        window._currentBoxData = boxData;
        window._moveCameraToCurrentBox = () => {
            this.moveCameraToBox(boxData);
        };
        
        // Display in info panel (similar to annotations)
        if (window.showAnnotationInPanel) {
            const details = {
                description: `
                    <p><strong>Confidence:</strong> ${(boxData.confidence * 100).toFixed(1)}%</p>
                    <p><strong>Position:</strong> (${boxData.position[0].toFixed(2)}, ${boxData.position[1].toFixed(2)}, ${boxData.position[2].toFixed(2)})</p>
                    <p><strong>Size:</strong> ${boxData.size[0].toFixed(2)} x ${boxData.size[1].toFixed(2)} x ${boxData.size[2].toFixed(2)} m</p>
                    <button id="go-to-object-btn" style="margin-top: 12px; padding: 8px 16px; background: #0c0a0aff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: 500;">Move to Object</button>
                `
            };
            window.showAnnotationInPanel(boxData.label, details);
            
            // Add click handler to the button after it's added to DOM
            setTimeout(() => {
                const goToBtn = document.getElementById('go-to-object-btn');
                if (goToBtn) {
                    goToBtn.addEventListener('click', () => {
                        if (window._moveCameraToCurrentBox) {
                            window._moveCameraToCurrentBox();
                        } else {
                            console.warn('_moveCameraToCurrentBox not found');
                        }
                    });
                } else {
                    console.warn('go-to-object-btn element not found');
                }
            }, 50);
        }
    }
    
    /**
     * Show only the specified box, hide all others
     * @param {string} activeBoxId - ID of the box to keep visible, or null to show all
     */
    setActiveBox(activeBoxId) {
        this.activeBoxId = activeBoxId;
        
        this.boxEntities.forEach(boxEntity => {
            const boxId = boxEntity.name.replace('bbox-', '');
            const shouldShow = !activeBoxId || boxId === activeBoxId;
            boxEntity.enabled = shouldShow;
            
            // Disable collision box rendering for the active box to prevent blocking UI elements
            const collisionBox = boxEntity.findByName('collision-box');
            if (collisionBox && collisionBox.render) {
                if (activeBoxId && boxId === activeBoxId) {
                    // Disable rendering to prevent raycasting and blocking clicks
                    collisionBox.render.enabled = false;
                } else if (shouldShow) {
                    // Re-enable rendering for visible boxes
                    collisionBox.render.enabled = true;
                }
            }
        });
    }
    
    /**
     * Show all bounding boxes
     */
    showAllBoxes() {
        this.setActiveBox(null);
    }
    
    /**
     * Hide all bounding boxes
     */
    hideAllBoxes() {
        this.boxEntities.forEach(boxEntity => {
            boxEntity.enabled = false;
        });
    }
    
    /**
     * Move camera to focus on a specific bounding box
     * @param {object} boxData - The box data including position and size
     */
    moveCameraToBox(boxData) {
        // Find the camera controls script
        const cameraEntity = this.app.root.findByName('camera');
        if (!cameraEntity) {
            console.warn('BoundingBoxLoader: camera entity not found');
            return;
        }

        const cameraControls = cameraEntity.script?.cameraControls;
        if (!cameraControls) {
            console.warn('BoundingBoxLoader: cameraControls script not found');
            return;
        }

        // Calculate the focus point (center of the bounding box)
        let focusPoint = new Vec3(boxData.position[0], boxData.position[1], boxData.position[2]);

        // Get the parent splat entity's world transform to convert to world space
        const splatEntity = this.entity.parent;
        const worldTransform = splatEntity ? splatEntity.getWorldTransform() : null;
        if (worldTransform) {
            worldTransform.transformPoint(focusPoint, focusPoint);
        }

        // FocusPoint tweaking options:
        // - shorthand array: "focusPoint": [x,y,z] (treated as local offset)
        // - object.offset: { "offset": [x,y,z], "local": true|false }
        // - object.absolute: { "absolute": [x,y,z] } (uses world coords)
        if (boxData.focusPoint) {
            // shorthand array -> treat as local offset from box center
            if (Array.isArray(boxData.focusPoint) && boxData.focusPoint.length >= 3) {
                const fpOffset = new Vec3(boxData.focusPoint[0], boxData.focusPoint[1], boxData.focusPoint[2]);
                if (worldTransform && typeof worldTransform.transformVector === 'function') {
                    worldTransform.transformVector(fpOffset, fpOffset);
                } else if (worldTransform) {
                    // fall back to transformPoint (works but includes translation)
                    worldTransform.transformPoint(fpOffset, fpOffset);
                }
                focusPoint.add(fpOffset);
            }

            // object with offset field
            else if (boxData.focusPoint.offset && Array.isArray(boxData.focusPoint.offset) && boxData.focusPoint.offset.length >= 3) {
                const fpOffset = new Vec3(boxData.focusPoint.offset[0], boxData.focusPoint.offset[1], boxData.focusPoint.offset[2]);
                // local flag defaults to true - interpret offset in the box's local space
                const isLocal = boxData.focusPoint.local !== false;
                if (isLocal && worldTransform && typeof worldTransform.transformVector === 'function') {
                    worldTransform.transformVector(fpOffset, fpOffset);
                } else if (isLocal && worldTransform) {
                    worldTransform.transformPoint(fpOffset, fpOffset);
                } else if (!isLocal && worldTransform) {
                    // treat as world-space offset point
                    worldTransform.transformPoint(fpOffset, fpOffset);
                }
                focusPoint.add(fpOffset);
            }

            // absolute world coordinates override
            else if (boxData.focusPoint.absolute && Array.isArray(boxData.focusPoint.absolute) && boxData.focusPoint.absolute.length >= 3) {
                focusPoint = new Vec3(boxData.focusPoint.absolute[0], boxData.focusPoint.absolute[1], boxData.focusPoint.absolute[2]);
            }
        }
        
        // Calculate camera distance based on box size
        const maxDimension = Math.max(boxData.size[0], boxData.size[1], boxData.size[2]);
        const baseDistance = Math.max(maxDimension * 3, 1.0);
        
        // Compute offset based on per-object view settings
        let offset = new Vec3(
            boxData.size[0] * 1.5,  // X offset based on width (default)
            boxData.size[1] * 1.5,  // Y offset (default)
            boxData.size[2] * 1.5   // Z offset (default)
        );

        if (boxData.view) {
            // view.offset: [x, y, z] in local box space (applied after world transform)
            if (Array.isArray(boxData.view.offset) && boxData.view.offset.length >= 3) {
                offset = new Vec3(boxData.view.offset[0], boxData.view.offset[1], boxData.view.offset[2]);
                if (splatEntity) {
                    splatEntity.getWorldTransform().transformPoint(offset, offset);
                }
            }
            // view.spherical: { distance, yaw, pitch } in degrees (yaw around Y, pitch up/down)
            else if (boxData.view.spherical) {
                const s = boxData.view.spherical;
                const dist = (typeof s.distance === 'number') ? s.distance : baseDistance;
                const pitchDeg = Math.max(-85, Math.min(85, (typeof s.pitch === 'number') ? s.pitch : 20));
                const yawDeg = (typeof s.yaw === 'number') ? s.yaw : 45;
                const yaw = yawDeg * Math.PI / 180;
                const pitch = pitchDeg * Math.PI / 180;
                // Convert spherical (yaw, pitch) -> Cartesian offset
                const x = dist * Math.cos(pitch) * Math.sin(yaw);
                const y = dist * Math.sin(pitch);
                const z = dist * Math.cos(pitch) * Math.cos(yaw);
                offset = new Vec3(x, y, z);
            }
            // view.euler: { yaw, pitch, roll, distance } - yaw/pitch in degrees, distance numeric
            else if (boxData.view.euler) {
                const e = boxData.view.euler;
                const dist = (typeof e.distance === 'number') ? e.distance : baseDistance;
                const yawDeg = (typeof e.yaw === 'number') ? e.yaw : 45;
                const pitchDeg = (typeof e.pitch === 'number') ? e.pitch : 20;
                const yaw = yawDeg * Math.PI / 180;
                const pitch = Math.max(-85, Math.min(85, pitchDeg)) * Math.PI / 180;
                // Build forward vector from yaw/pitch then invert to get camera offset behind the object
                const fx = Math.cos(pitch) * Math.sin(yaw);
                const fy = Math.sin(pitch);
                const fz = Math.cos(pitch) * Math.cos(yaw);
                // Camera should be at focus - forward * distance (so it's looking at the focus)
                offset = new Vec3(-fx * dist, -fy * dist, -fz * dist);
            }
        }
        
        // Calculate camera position at an angle from the box
        const newCameraPos = new Vec3().add2(focusPoint, offset);
        
        
        // Update the pose before calling reset to avoid flashing to wrong position
        cameraControls._pose.look(newCameraPos, focusPoint);
        
        // Update the focus point in camera controls
        cameraControls.focusPoint.copy(focusPoint);
        
        // Use the reset method to smoothly move to the new position
        cameraControls.reset(focusPoint, newCameraPos);

        // Hide the info panel after moving to the object
        setTimeout(() => {
            const infoPanel = document.getElementById('info-panel');
            if (infoPanel && infoPanel.classList.contains('open')) {
                infoPanel.classList.remove('open');
                // Also hide annotation details
                if (window.hideAnnotationInPanel) {
                    window.hideAnnotationInPanel();
                }
            }
        }, 100);
        
    }
    
    postInitialize() {
        // Load after everything is initialized
        if (this.autoLoad) {
            this.loadBoundingBoxes();
        }
    }

    loadBoundingBoxes() {
        // Clear existing boxes
        this.clearBoxes();

        // Fetch bounding boxes from configured JSON URL

        // Fetch the JSON file
        fetch(this.jsonUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load: ${this.jsonUrl}`);
                }
                return response.json();
            })
            .then(data => {
                this.boxes = data.boundingBoxes;
                this.createBoundingBoxes();
            })
            .catch(error => {
                console.error('Error loading bounding boxes:', error);
            });
    }

    createBoundingBoxes() {
        this.boxes.forEach(box => {
            const boxEntity = this.createBoundingBox(box);
            this.boxEntities.push(boxEntity);
        });
    }

    createBoundingBox(boxData) {
        const { id, label, position, size, rotation, color, confidence } = boxData;
        
        
        // For splat scenes that were originally (Z-up), 
        // compensate for splat scene +90 X rotation by swapping Y/Z in size
        let adjustedSize = size;
        adjustedSize = [size[0], size[2], size[1]];
        
        // Create container entity
        const boxEntity = new Entity(`bbox-${id}`);
        
        // Get the parent splat entity's world transform
        const splatEntity = this.entity.parent;
        if (splatEntity) {
            // Apply position in world space by accounting for parent transform
            const worldPos = new Vec3(position[0], position[1], position[2]);
            splatEntity.getWorldTransform().transformPoint(worldPos, worldPos);
            boxEntity.setPosition(worldPos);
            
            // Apply rotation in world space
            const worldRot = splatEntity.getRotation().clone();
            const localRot = new Vec3(rotation[0], rotation[1], rotation[2]);
            boxEntity.setEulerAngles(
                worldRot.x + localRot.x,
                worldRot.y + localRot.y,
                worldRot.z + localRot.z
            );
        } else {
            // Fallback to local positioning
            boxEntity.setPosition(position[0], position[1], position[2]);
            boxEntity.setEulerAngles(rotation[0], rotation[1], rotation[2]);
        }
        
        // Add to scene root instead of this entity
        this.app.root.addChild(boxEntity);

        // Store metadata
        boxEntity.boxData = boxData;

        // Create the box wireframe
        this.createWireframe(boxEntity, adjustedSize, color);
        
        // Add clickable collision box for interaction
        this.createCollisionBox(boxEntity, adjustedSize, boxData);

        // Create label if enabled
        if (this.showLabels) {
            this.createLabel(boxEntity, label, confidence);
        }
        
        
        return boxEntity;
    }
    
    createCollisionBox(parentEntity, size, boxData) {
        // Create an invisible box mesh for raycasting
        const collisionBox = new Entity('collision-box');
        parentEntity.addChild(collisionBox);
        
        // Make it invisible but present for raycasting
        const material = new StandardMaterial();
        material.opacity = 0;
        material.blendType = 2; // BLEND_NORMAL
        material.depthTest = false;
        material.depthWrite = false;
        material.update();
        
        collisionBox.addComponent('render', {
            type: 'box',
            layers: [BoundingBoxLoader.boundingBoxLayer.id]
        });
        collisionBox.render.meshInstances[0].material = material;
        
        // Scale to match the bounding box size
        collisionBox.setLocalScale(size[0], size[1], size[2]);
        
        // Store reference to boxData for click handling
        collisionBox.boxData = boxData;
    }

    createWireframe(parentEntity, size, color) {
        // Create multiple boxes with slight offset to simulate thicker lines
        const lineThickness = 5; // Number of overlapping boxes
        const offset = 0.002; // Small offset between boxes
        
        for (let i = 0; i < lineThickness; i++) {
            const boxEntity = new Entity(`wireframe-box-${i}`);
            parentEntity.addChild(boxEntity);
            
            boxEntity.addComponent('render', {
                type: 'box',
                layers: [BoundingBoxLoader.boundingBoxLayer.id]
            });
            
            // Slightly scale each box to create thickness effect
            const scale = 1 + (i * offset);
            boxEntity.setLocalScale(size[0] * scale, size[1] * scale, size[2] * scale);
            
            // Create a material for the wireframe (always visible like annotations)
            const material = new StandardMaterial();
            material.emissive = new Color(color[0], color[1], color[2]);
            material.emissiveIntensity = 2.5; // Very bright
            material.useLighting = false;
            material.depthTest = false; // Always visible, no depth testing
            material.depthWrite = false; // Don't write to depth buffer
            material.update();
            
            // Apply material and set to wireframe rendering
            const meshInstance = boxEntity.render.meshInstances[0];
            meshInstance.material = material;
            
            // Set render style to wireframe (1 = RENDERSTYLE_WIREFRAME)
            meshInstance.renderStyle = 1;
        }
        
    }

    createLabel(parentEntity, label, confidence) {
        // Create a simple element-based label (3D text would require more setup)
        // Store label data for potential UI display
        parentEntity.label = label;
        parentEntity.confidence = confidence;

        // You could create a 3D text entity here if you have a font asset
        // For now, we'll just store the data and it can be displayed in the info panel
    }

    clearBoxes() {
        this.boxEntities.forEach(entity => {
            entity.destroy();
        });
        this.boxEntities = [];
    }
    
    /**
     * Custom ray-box intersection test using entity transforms
     * @param {Vec3} rayOrigin - Ray origin point
     * @param {Vec3} rayDirection - Normalized ray direction
     * @param {Entity} boxEntity - The box entity to test
     * @returns {number|null} Distance to intersection or null if no hit
     */
    rayBoxIntersect(rayOrigin, rayDirection, boxEntity) {
        // Get box world position and scale
        const boxPos = boxEntity.getPosition();
        const boxScale = boxEntity.getLocalScale();
        
        // Calculate AABB in world space
        const halfExtents = new Vec3(boxScale.x / 2, boxScale.y / 2, boxScale.z / 2);
        const min = new Vec3(boxPos.x - halfExtents.x, boxPos.y - halfExtents.y, boxPos.z - halfExtents.z);
        const max = new Vec3(boxPos.x + halfExtents.x, boxPos.y + halfExtents.y, boxPos.z + halfExtents.z);
        
        // Slab method ray-AABB intersection
        let tmin = -Infinity;
        let tmax = Infinity;
        
        // Check X slab
        if (Math.abs(rayDirection.x) < 0.0001) {
            if (rayOrigin.x < min.x || rayOrigin.x > max.x) return null;
        } else {
            const tx1 = (min.x - rayOrigin.x) / rayDirection.x;
            const tx2 = (max.x - rayOrigin.x) / rayDirection.x;
            tmin = Math.max(tmin, Math.min(tx1, tx2));
            tmax = Math.min(tmax, Math.max(tx1, tx2));
        }
        
        // Check Y slab
        if (Math.abs(rayDirection.y) < 0.0001) {
            if (rayOrigin.y < min.y || rayOrigin.y > max.y) return null;
        } else {
            const ty1 = (min.y - rayOrigin.y) / rayDirection.y;
            const ty2 = (max.y - rayOrigin.y) / rayDirection.y;
            tmin = Math.max(tmin, Math.min(ty1, ty2));
            tmax = Math.min(tmax, Math.max(ty1, ty2));
        }
        
        // Check Z slab
        if (Math.abs(rayDirection.z) < 0.0001) {
            if (rayOrigin.z < min.z || rayOrigin.z > max.z) return null;
        } else {
            const tz1 = (min.z - rayOrigin.z) / rayDirection.z;
            const tz2 = (max.z - rayOrigin.z) / rayDirection.z;
            tmin = Math.max(tmin, Math.min(tz1, tz2));
            tmax = Math.min(tmax, Math.max(tz1, tz2));
        }
        
        // Check for intersection
        if (tmax < tmin || tmax < 0) return null;
        
        return tmin > 0 ? tmin : tmax;
    }

    destroy() {
        this.clearBoxes();
    }
}

export { BoundingBoxLoader };
