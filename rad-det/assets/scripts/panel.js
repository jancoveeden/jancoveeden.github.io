// Info Panel Control
document.addEventListener('DOMContentLoaded', function() {
    const infoButton = document.getElementById('info-button');
    const infoPanel = document.getElementById('info-panel');
    const closePanel = document.getElementById('close-panel');
    const resetButton = document.getElementById('reset-button');
    const sceneSelectorButton = document.getElementById('scene-selector-button');
    const sceneSelectorModal = document.getElementById('scene-selector-modal');
    const closeModal = document.getElementById('close-modal');
    const fullscreenButton = document.getElementById('fullscreen-button');
    const fullscreenEnterIcon = document.getElementById('fullscreen-enter-icon');
    const fullscreenExitIcon = document.getElementById('fullscreen-exit-icon');
    const bboxToggleButton = document.getElementById('bbox-toggle-button');
    const bboxVisibleIcon = document.getElementById('bbox-visible-icon');
    const bboxHiddenIcon = document.getElementById('bbox-hidden-icon');
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingBarFill = document.getElementById('loading-bar-fill');
    const loadingPercentage = document.getElementById('loading-percentage');

    // Wait for PlayCanvas app to be fully ready before hiding loading
    let sceneReadyCheckInterval = null;
    let loadingCheckStarted = false;
    
    function checkSceneReady() {
        const pcApp = document.querySelector('pc-app');
        if (!pcApp || !pcApp.app) return false;
        
        const app = pcApp.app;
        const splatEntity = app.root.findByName('apartment');
        
        if (!splatEntity || !splatEntity.gsplat) return false;
        
        // Check if splat is enabled and has rendered at least one frame
        if (splatEntity.enabled && splatEntity.gsplat.asset) {
            return true;
        }
        
        return false;
    }
    
    function startSceneReadyCheck() {
        if (loadingCheckStarted) return;
        loadingCheckStarted = true;
        
        let progress = 0;
        sceneReadyCheckInterval = setInterval(() => {
            // Gradually increase progress while waiting
            progress += 0.02;
            if (progress < 0.95) {
                if (window.updateLoadingProgress) {
                    window.updateLoadingProgress(progress);
                }
            }
            
            // Check if scene is actually ready
            if (checkSceneReady()) {
                clearInterval(sceneReadyCheckInterval);
                if (window.updateLoadingProgress) {
                    window.updateLoadingProgress(1.0);
                }
                // Add a small delay to ensure first frame is rendered
                setTimeout(() => {
                    if (loadingOverlay) {
                        loadingOverlay.classList.add('hidden');
                    }
                }, 500);
            }
        }, 100);
        
        // Failsafe: hide after 15 seconds even if scene not detected as ready
        setTimeout(() => {
            if (sceneReadyCheckInterval) {
                clearInterval(sceneReadyCheckInterval);
                if (window.updateLoadingProgress) {
                    window.updateLoadingProgress(1.0);
                }
                if (loadingOverlay) {
                    loadingOverlay.classList.add('hidden');
                }
            }
        }, 15000);
    }
    
    // Start checking when DOM is loaded
    setTimeout(startSceneReadyCheck, 500);

    // Expose loading functions globally
    window.showLoading = function() {
        if (loadingOverlay) {
            loadingOverlay.classList.remove('hidden');
            if (loadingBarFill) loadingBarFill.style.width = '0%';
            if (loadingPercentage) loadingPercentage.textContent = '0%';
        }
    };

    window.updateLoadingProgress = function(progress) {
        const percentage = Math.round(progress * 100);
        if (loadingBarFill) loadingBarFill.style.width = percentage + '%';
        if (loadingPercentage) loadingPercentage.textContent = percentage + '%';
    };

    window.hideLoading = function() {
        // Wait for actual scene to be visible before hiding
        const checkInterval = setInterval(() => {
            if (checkSceneReady()) {
                clearInterval(checkInterval);
                setTimeout(() => {
                    if (loadingOverlay) {
                        loadingOverlay.classList.add('hidden');
                    }
                }, 300);
            }
        }, 100);
        
        // Failsafe timeout
        setTimeout(() => {
            clearInterval(checkInterval);
            if (loadingOverlay) {
                loadingOverlay.classList.add('hidden');
            }
        }, 5000);
    };

    // Toggle panel on button click
    if (infoButton) {
        infoButton.addEventListener('click', function() {
            infoPanel.classList.toggle('open');
        });
    }

    // Close panel
    if (closePanel) {
        closePanel.addEventListener('click', function() {
            infoPanel.classList.remove('open');
            // Hide annotation details when closing panel
            window.hideAnnotationInPanel();
        });
    }

    // Close panel when clicking outside
    document.addEventListener('click', function(event) {
        // Don't close if a bounding box was just clicked
        if (window._boundingBoxClicked) {
            return;
        }
        
        if (!infoPanel.contains(event.target) && 
            !infoButton.contains(event.target) && 
            infoPanel.classList.contains('open')) {
            // Don't close if clicking on annotation markers
            if (!event.target.closest('.annotation') && 
                !event.target.closest('.clickable-annotation') &&
                !event.target.closest('.pc-annotation-hotspot')) {
                infoPanel.classList.remove('open');
                // Hide annotation details when closing panel
                window.hideAnnotationInPanel();
            }
        }
    });

    // Detect camera movement to hide annotation details
    let lastCameraPosition = null;
    let lastCameraRotation = null;
    let cameraMoveCheckInterval = null;

    // Function to check if camera has moved
    function checkCameraMovement() {
        // Try to find the PlayCanvas app
        const pcApp = document.querySelector('pc-app');
        if (!pcApp || !pcApp.app) return;

        const app = pcApp.app;
        const cameraEntity = app.root.findByName('camera');
        
        if (!cameraEntity) return;

        const currentPos = cameraEntity.getPosition();
        const currentRot = cameraEntity.getRotation();

        // Check if this is the first check
        if (lastCameraPosition === null) {
            lastCameraPosition = currentPos.clone();
            lastCameraRotation = currentRot.clone();
            return;
        }

        // Calculate distance moved
        const posDelta = currentPos.distance(lastCameraPosition);
        const rotDelta = Math.abs(currentRot.x - lastCameraRotation.x) + 
                        Math.abs(currentRot.y - lastCameraRotation.y) + 
                        Math.abs(currentRot.z - lastCameraRotation.z) + 
                        Math.abs(currentRot.w - lastCameraRotation.w);

        // If camera moved significantly, hide annotation details
        if (posDelta > 0.01 || rotDelta > 0.01) {
            window.hideAnnotationInPanel();
        }

        // Update last known position/rotation
        lastCameraPosition = currentPos.clone();
        lastCameraRotation = currentRot.clone();
    }

    // Start checking for camera movement after a short delay (to let PlayCanvas initialize)
    setTimeout(() => {
        cameraMoveCheckInterval = setInterval(checkCameraMovement, 100);
    }, 1000);

    // Reset functionality
    if (resetButton) {
        resetButton.addEventListener('click', function() {
            // Hide annotation details
            window.hideAnnotationInPanel();
            
            // Reset camera to default position
            const pcApp = document.querySelector('pc-app');
            if (pcApp && pcApp.app) {
                const app = pcApp.app;
                const cameraEntity = app.root.findByName('camera');
                
                if (cameraEntity) {
                    const cameraControls = cameraEntity.script?.cameraControls;
                    
                    if (cameraControls) {
                        // Get the current scene ID (stored when scene is loaded)
                        const currentSceneId = window._currentSceneId || 'apartment';
                        
                        // Define scene configurations (same as in updatePlayCanvasScene)
                        const sceneConfigs = {
                            'apartment': {
                                cameraFocus: [0, 1, 0],      
                                cameraPosition: [0.5, 1, 0.5]
                            },
                            'office': {
                                cameraFocus: [0, 0, 0],      
                                cameraPosition: [-1, 0, 0]
                            }
                        };
                        
                        const config = sceneConfigs[currentSceneId];
                        
                        let focusPoint = config ? config.cameraFocus : [0, 1, 0];
                        let cameraPosition = config ? config.cameraPosition : [0.5, 1, 0.5];
                        
                        // Create Vec3 objects using the camera's position clone method
                        const defaultFocus = cameraEntity.getPosition().clone().set(focusPoint[0], focusPoint[1], focusPoint[2]);
                        const defaultPosition = cameraEntity.getPosition().clone().set(cameraPosition[0], cameraPosition[1], cameraPosition[2]);
                        
                        // Update pose before reset to prevent flash
                        cameraControls._pose.look(defaultPosition, defaultFocus);
                        cameraControls.reset(defaultFocus, defaultPosition);
                    }
                }
            }
            
            // Close any active annotation tooltips
            if (window.Annotation && window.Annotation._activeTooltip) {
                window.Annotation._activeTooltip.style.opacity = '0';
                setTimeout(() => {
                    if (window.Annotation._activeTooltip) {
                        window.Annotation._activeTooltip.style.visibility = 'hidden';
                    }
                    window.Annotation._activeTooltip = null;
                }, 200);
            }
        });
    }

    // Scene selector functionality
    if (sceneSelectorButton) {
        sceneSelectorButton.addEventListener('click', function() {
            sceneSelectorModal.classList.add('open');
        });
    }

    if (closeModal) {
        closeModal.addEventListener('click', function() {
            sceneSelectorModal.classList.remove('open');
        });
    }

    // Close modal when clicking outside
    if (sceneSelectorModal) {
        sceneSelectorModal.addEventListener('click', function(e) {
            if (e.target === sceneSelectorModal) {
                sceneSelectorModal.classList.remove('open');
            }
        });

        // Handle scene selection
        const sceneCards = sceneSelectorModal.querySelectorAll('.scene-card');
        sceneCards.forEach(card => {
            card.addEventListener('click', function() {
                const sceneId = this.getAttribute('data-scene');
                
                // Remove active class from all cards
                sceneCards.forEach(c => c.classList.remove('active'));
                
                // Add active class to clicked card
                this.classList.add('active');
                
                // Load the selected scene
                loadScene(sceneId);
                
                // Close modal after a short delay
                setTimeout(() => {
                    sceneSelectorModal.classList.remove('open');
                }, 300);
            });
        });
    }

    // Function to load a scene
    function loadScene(sceneId) {
        // Update the scene title
        const sceneTitle = document.getElementById('scene-title');
        const sceneTitles = {
            'apartment': 'Apartment',
            'office': 'Office'
        };
        
        if (sceneTitle && sceneTitles[sceneId]) {
            sceneTitle.textContent = sceneTitles[sceneId];
        }
        
        // Update info panel content for the scene
        updateInfoPanelForScene(sceneId);
        
        // Hide annotation details when switching scenes
        window.hideAnnotationInPanel();
        
        // Close any active annotation tooltips
        if (window.Annotation && window.Annotation._activeTooltip) {
            window.Annotation._activeTooltip.style.opacity = '0';
            setTimeout(() => {
                if (window.Annotation._activeTooltip) {
                    window.Annotation._activeTooltip.style.visibility = 'hidden';
                }
                window.Annotation._activeTooltip = null;
            }, 200);
        }

        bboxVisible = true;
        window._bboxVisible = true;
        // Show bounding boxes
        if (window.showAllBoundingBoxes) {
            window.showAllBoundingBoxes();
        }
        bboxVisibleIcon.style.display = 'block';
        bboxHiddenIcon.style.display = 'none';
        bboxToggleButton.title = 'Hide Bounding Boxes';

        
        // Update the PlayCanvas scene
        const pcApp = document.querySelector('pc-app');
        if (pcApp && pcApp.app) {
            // Wait for the app to be fully started before switching scenes
            if (pcApp.app.renderNextFrame) {
                updatePlayCanvasScene(pcApp.app, sceneId);
            } else {
                // App not fully initialized, wait a bit
                setTimeout(() => {
                    updatePlayCanvasScene(pcApp.app, sceneId);
                }, 100);
            }
        } else {
            console.warn('PlayCanvas app not found');
        }
    }

    // Fullscreen functionality
    if (fullscreenButton) {
        fullscreenButton.addEventListener('click', function() {
            if (!document.fullscreenElement) {
                // Enter fullscreen
                document.documentElement.requestFullscreen().catch(err => {
                    console.error('Error attempting to enable fullscreen:', err);
                });
            } else {
                // Exit fullscreen
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                }
            }
        });

        // Listen for fullscreen changes to update button icon
        document.addEventListener('fullscreenchange', function() {
            if (document.fullscreenElement) {
                // In fullscreen - show exit icon
                fullscreenEnterIcon.style.display = 'none';
                fullscreenExitIcon.style.display = 'block';
                fullscreenButton.title = 'Exit Fullscreen';
            } else {
                // Not in fullscreen - show enter icon
                fullscreenEnterIcon.style.display = 'block';
                fullscreenExitIcon.style.display = 'none';
                fullscreenButton.title = 'Enter Fullscreen';
            }
        });
    }

    // Bounding Box Toggle Button
    let bboxVisible = true;
    // Persist visibility across interactions (camera movement, panel close)
    window._bboxVisible = true;
    if (bboxToggleButton) {
        bboxToggleButton.addEventListener('click', function() {
            bboxVisible = !bboxVisible;
            // store user intent globally
            window._bboxVisible = bboxVisible;
            
            if (bboxVisible) {
                // Show bounding boxes
                if (window.showAllBoundingBoxes) {
                    window.showAllBoundingBoxes();
                }
                bboxVisibleIcon.style.display = 'block';
                bboxHiddenIcon.style.display = 'none';
                bboxToggleButton.title = 'Hide Bounding Boxes';
            } else {
                // Hide bounding boxes
                if (window.hideBoundingBoxes) {
                    window.hideBoundingBoxes();
                }
                bboxVisibleIcon.style.display = 'none';
                bboxHiddenIcon.style.display = 'block';
                bboxToggleButton.title = 'Show Bounding Boxes';
            }
        });
    }

    // Track current scene for coordinate transformation
    window._currentSceneId = null;
    
    // Initialize the correct scene on page load
    initializeScene();
});

/**
 * Initialize scene based on URL parameter
 * Default scene is 'apartment'
 */
function initializeScene() {
    const sceneId = 'apartment'; // Always default to apartment
    
    // Set the current scene ID globally
    window._currentSceneId = sceneId;

    // Update the scene title
    const sceneTitle = document.getElementById('scene-title');
    const sceneTitles = {
        'apartment': 'Apartment',
        'office': 'Office'
    };
    
    if (sceneTitle && sceneTitles[sceneId]) {
        sceneTitle.textContent = sceneTitles[sceneId];
    }
    
    // Update info panel content for the default scene
    updateInfoPanelForScene(sceneId);
    
    // Update active scene card
    const sceneCards = document.querySelectorAll('.scene-card');
    sceneCards.forEach(card => {
        if (card.getAttribute('data-scene') === sceneId) {
            card.classList.add('active');
        } else {
            card.classList.remove('active');
        }
    });
}

/**
 * Update the PlayCanvas scene with the selected model
 */
function updatePlayCanvasScene(app, sceneId) {
    // Track current scene for coordinate transformations
    window._currentSceneId = sceneId;
    
    // Find the current splat entity
    let splatEntity = app.root.findByName('apartment');
    
    if (!splatEntity) {
        console.warn('Splat entity not found');
        return;
    }
    
    // PlayCanvas splat entity found
    
    // Define scene configurations
    const sceneConfigs = {
        'apartment': {
            asset: 'apartment',
            position: [0, 1, 0],
            rotation: [90, -75, 180],
            hasAnnotations: true,
            cameraFocus: [0, 1, 0],      
            cameraPosition: [0.5, 1, 0.5],
            sceneBoundary: { min: [-0.7, 0.8, -0.7], max: [0.7, 1.2, 0.7] }
        },
        'office': {
            asset: 'office',
            position: [0.4, -0.5, 0], 
            rotation: [90, 0, 180],
            hasAnnotations: true,
            cameraFocus: [0, 0, 0],      
            cameraPosition: [-1, 0, 0],
            sceneBoundary: { min: [-0.9, -0.2, -0.9], max: [1.3, 0.7, 0.8] }
        }
    };
    
    const config = sceneConfigs[sceneId];
    if (!config) {
        console.warn('Unknown scene:', sceneId);
        return;
    }
    
    // Handle annotations based on scene type
    const annotationEntities = splatEntity.find((entity) => {
        return entity.script && entity.script.annotation;
    });
    
    // Show/hide annotations based on which scene they belong to
    annotationEntities.forEach(entity => {
        if (sceneId === 'apartment' && entity.name.includes('apartment')) {
            entity.enabled = true;
        } else if (sceneId === 'office' && entity.name.includes('office')) {
            entity.enabled = true;
        } else {
            entity.enabled = false;
        }
    });
    
    // Find the asset
    const asset = app.assets.find(config.asset);
    if (!asset) {
        console.warn('Asset not found:', config.asset);
        return;
    }
    
    // Show loading indicator
    if (window.showLoading) {
        window.showLoading();
    }
    
    // Track loading progress
    let progressInterval = null;
    let simulatedProgress = 0;
    
    // Ensure the asset is loaded before updating
    if (asset.loading || !asset.loaded) {
        // Simulate progress for assets without progress events
        progressInterval = setInterval(() => {
            simulatedProgress += 0.05;
            if (simulatedProgress < 0.9) {
                if (window.updateLoadingProgress) {
                    window.updateLoadingProgress(simulatedProgress);
                }
            }
        }, 100);
        
        asset.ready(() => {
            if (progressInterval) clearInterval(progressInterval);
            if (window.updateLoadingProgress) {
                window.updateLoadingProgress(1.0);
            }
            setTimeout(() => {
                updateSplatAndTransform();
                if (window.hideLoading) {
                    window.hideLoading();
                }
            }, 300);
        });
        
        if (!asset.loading) {
            app.assets.load(asset);
        }
    } else {
        // Asset already loaded
        if (window.updateLoadingProgress) {
            window.updateLoadingProgress(1.0);
        }
        setTimeout(() => {
            updateSplatAndTransform();
            if (window.hideLoading) {
                window.hideLoading();
            }
        }, 300);
    }
    
    function updateSplatAndTransform() {
        // Switching scene (internal)
        
        // Check if gsplat component exists, if not, create it
        if (!splatEntity.gsplat) {
            splatEntity.addComponent('gsplat', {
                asset: asset.id
            });
        }
        
        // Get the gsplat component (use 'gsplat' not 'splat')
        const splatComponent = splatEntity.gsplat;
        
        if (!splatComponent) {
            console.error('GSplat component still not found after creation attempt');
            return;
        }
        
        // Temporarily hide the entity to prevent seeing rotation change
        const wasEnabled = splatEntity.enabled;
        splatEntity.enabled = false;
        
        // Update position and rotation while hidden
        splatEntity.setPosition(config.position[0], config.position[1], config.position[2]);
        splatEntity.setEulerAngles(config.rotation[0], config.rotation[1], config.rotation[2]);
        
        // Update the asset on the existing splat component
        splatComponent.asset = asset.id;
        
        // Scene switch applied
        
        // Re-enable on next frame to show the new scene with correct transform
        requestAnimationFrame(() => {
            splatEntity.enabled = wasEnabled;
            
            // Continue with annotations after re-enabling
            addAnnotations();
        });
    }
    
    function addAnnotations() {
        // Load bounding boxes for the current scene
        if (window.loadBoundingBoxesForScene) {
            window.loadBoundingBoxesForScene(sceneId);
        }
        
        // Just reset the camera
        resetCamera();
    }
    
    function resetCamera() {
        // Reset camera to default view
        setTimeout(() => {
            const cameraEntity = app.root.findByName('camera');
            if (cameraEntity) {
                const cameraControls = cameraEntity.script?.cameraControls;
                if (cameraControls) {
                    // Update scene boundary for the current scene
                    if (config.sceneBoundary) {
                        cameraControls.sceneBoundary = config.sceneBoundary;
                    }
                    
                    // Use scene-specific camera settings if available
                    let focusPoint = config.cameraFocus;
                    let cameraPosition = config.cameraPosition;
                    
                    // Get Vec3 constructor from existing position
                    const vec3Example = cameraEntity.getPosition();
                    const Vec3Constructor = Object.getPrototypeOf(vec3Example).constructor;
                    
                    let defaultFocus, defaultPosition;
                    
                    // For office scene, coordinates are already in Z-up format
                    defaultFocus = new Vec3Constructor(focusPoint[0], focusPoint[1], focusPoint[2]);
                    defaultPosition = new Vec3Constructor(cameraPosition[0], cameraPosition[1], cameraPosition[2]);
                    
                    // Recalculate and update the start zoom distance for this scene
                    cameraControls._startZoomDist = defaultPosition.distance(defaultFocus);
                    
                    // Update pose before reset to prevent flash
                    cameraControls._pose.look(defaultPosition, defaultFocus);
                    cameraControls.reset(defaultFocus, defaultPosition);
                }
            }
        }, 150);
    }
}

/**
 * Update info panel content based on the current scene
 * @param {string} sceneId - The ID of the current scene
 */
function updateInfoPanelForScene(sceneId) {
    const sceneInfo = {
        'apartment': {
            location: 'Cape Town',
            dateCaptured: '11 September, 2025',
            fileSize: '17 MB',
            numImages: '754',
            boxDataUrl: 'assets/box_data/apartment_rad_det_boxes.json'
        },
        'office': {
            location: 'Garden Route',
            dateCaptured: '11 November, 2025',
            fileSize: '15 MB',
            numImages: '695',
            boxDataUrl: 'assets/box_data/saffraan_rad_det_boxes.json'
        }
    };
    
    const info = sceneInfo[sceneId];
    if (!info) return;
    
    // Update location info
    const locationValue = document.querySelector('.info-section .info-row:nth-child(2) .info-value');
    if (locationValue) locationValue.textContent = info.location;
    
    const dateValue = document.querySelector('.info-section .info-row:nth-child(3) .info-value');
    if (dateValue) dateValue.textContent = info.dateCaptured;
    
    // Update file size
    const fileSizeValue = document.querySelector('.metadata-item:nth-child(2) .value');
    if (fileSizeValue) fileSizeValue.textContent = info.fileSize;
    
    // Update number of images
    const numImagesValue = document.querySelector('.metadata-item:nth-child(4) .value');
    if (numImagesValue) numImagesValue.textContent = info.numImages;
    
    // Update objects list - find the Objects section and update it
    const objectsSection = Array.from(document.querySelectorAll('.info-section')).find(section => {
        return section.querySelector('h3')?.textContent.includes('Objects');
    });
    
    if (objectsSection) {
        // Clear existing content
        const existingRows = objectsSection.querySelectorAll('.info-row');
        existingRows.forEach(row => row.remove());
        
        // Load objects from bounding box JSON
        if (info.boxDataUrl) {
            fetch(info.boxDataUrl)
                .then(response => response.json())
                .then(data => {
                    if (data.boundingBoxes && data.boundingBoxes.length > 0) {
                        // Get unique labels and sort them
                        const uniqueLabels = [...new Set(data.boundingBoxes.map(box => box.label))].sort();
                        
                        // Add each unique object as a new row
                        uniqueLabels.forEach(label => {
                            const row = document.createElement('div');
                            row.className = 'info-row';
                            // Capitalize first letter
                            const displayLabel = label.charAt(0).toUpperCase() + label.slice(1);
                            row.innerHTML = `<span class="info-value">${displayLabel}</span>`;
                            objectsSection.appendChild(row);
                        });
                    }
                })
                .catch(error => {
                    console.warn('Could not load bounding box data for objects list:', error);
                    // Fallback to showing a message
                    const row = document.createElement('div');
                    row.className = 'info-row';
                    row.innerHTML = `<span class="info-value">No objects detected</span>`;
                    objectsSection.appendChild(row);
                });
        }
    }
}

/**
 * Show annotation details in the info panel
 * @param {string} title - The annotation title
 * @param {object|string} details - The annotation details object or JSON string
 */
window.showAnnotationInPanel = function(title, details) {
    const infoPanel = document.getElementById('info-panel');
    const annotationDetails = document.getElementById('annotation-details');
    const annotationTitle = document.getElementById('annotation-title');
    const annotationInfo = document.getElementById('annotation-info');

    if (!annotationDetails || !annotationTitle || !annotationInfo) {
        return;
    }

    let titleText = 'Selected Object';
    if (title && String(title).trim()) {
        const raw = String(title).trim();
        titleText = raw.charAt(0).toUpperCase() + raw.slice(1);
    }
    annotationTitle.textContent = titleText;
    
    // Parse and display details
    let detailsObj = {};
    try {
        detailsObj = typeof details === 'string' ? JSON.parse(details) : details;
    } catch (e) {
        detailsObj = { info: details };
    }

    // Only show the description text, without any label
    const description = detailsObj.description || detailsObj.info || detailsObj.text || 'No additional information available';
    annotationInfo.innerHTML = `<p style="margin: 0;">${description}</p>`;

    // Show the details section
    annotationDetails.classList.add('visible');

    // Open the panel
    infoPanel.classList.add('open');

    // Scroll to annotation details
    setTimeout(() => {
        annotationDetails.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
};

/**
 * Hide annotation details from the info panel
 */
window.hideAnnotationInPanel = function() {
    const annotationDetails = document.getElementById('annotation-details');
    if (annotationDetails) {
        annotationDetails.classList.remove('visible');
    }
    
    // Show all bounding boxes when panel is closed only if the user hasn't explicitly hidden them
    if (window._bboxVisible !== false) {
        if (window.showAllBoundingBoxes) {
            window.showAllBoundingBoxes();
        }
    }
};
