/**
 * ROSIMS - Research, Observation, Surveillance & Intelligence Management System
 * Interactive Neural Mesh Canvas Engine & OSINT Portal Logic
 */

(function () {
    'use strict';

    // Application State
    const state = {
        zoom: 1,
        panX: 0,
        panY: 0,
        isPanning: false,
        draggedNode: null,
        hoveredNode: null,
        selectedNode: null,
        physicsEnabled: true,
        expandedCategories: new Set(), // Set of category IDs currently expanded
        expandedRoot: false,           // Is ROSIMS root expanded
        favorites: new Set(JSON.parse(localStorage.getItem('ROSIMS_FAVS') || '[]')),
        notes: localStorage.getItem('ROSIMS_NOTES') || '',
        activeViewerTool: null
    };

    // Global Node Registry
    let nodes = [];
    let edges = [];
    let animationFrameId = null;

    // DOM Element References
    const canvas = document.getElementById('neural-canvas');
    const ctx = canvas.getContext('2d');
    const tooltip = document.getElementById('node-tooltip');

    // UI Drawers & Modals
    const searchModal = document.getElementById('search-modal');
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results-list');
    const searchCategoryFilters = document.getElementById('search-category-filters');
    
    const viewerDrawer = document.getElementById('viewer-drawer');
    const toolIframe = document.getElementById('tool-iframe');
    const iframeLoader = document.getElementById('iframe-loader');
    const iframeFallback = document.getElementById('iframe-fallback');
    
    const scratchpadDrawer = document.getElementById('scratchpad-drawer');
    const intelNotesInput = document.getElementById('intel-notes-input');
    const favsDrawer = document.getElementById('favs-drawer');
    const favsListContainer = document.getElementById('favs-list-container');
    const helpModal = document.getElementById('help-modal');

    // ==========================================
    // 1. NEURAL MESH GRAPH INITIALIZATION
    // ==========================================

    function initGraph() {
        nodes = [];
        edges = [];

        const width = canvas.width;
        const height = canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;

        // Reset camera pan to center
        state.panX = 0;
        state.panY = 0;

        // Core Root Node: ROSIMS
        const rootNode = {
            id: 'root',
            type: 'root',
            label: 'ROSIMS',
            sublabel: 'OSINT Intelligence System',
            icon: '🛡️',
            x: centerX,
            y: centerY,
            vx: 0,
            vy: 0,
            radius: 42,
            color: '#00f3ff',
            glowColor: 'rgba(0, 243, 255, 0.6)',
            visible: true,
            expanded: false
        };
        nodes.push(rootNode);

        // Category Nodes (Level 1)
        const totalCats = ROSIMS_DATA.length;
        const catRadius = 380; // Distance from center for initial orbit placement

        ROSIMS_DATA.forEach((cat, index) => {
            const angle = (index / totalCats) * Math.PI * 2;
            const catX = centerX + Math.cos(angle) * catRadius;
            const catY = centerY + Math.sin(angle) * catRadius;

            const catNode = {
                id: cat.id,
                type: 'category',
                label: cat.name,
                count: cat.count,
                icon: cat.icon,
                x: catX,
                y: catY,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                radius: 24,
                color: '#b026ff',
                glowColor: 'rgba(176, 38, 255, 0.5)',
                parentId: 'root',
                visible: false, // Initially hidden until ROSIMS root is clicked
                expanded: false,
                tools: cat.tools
            };
            nodes.push(catNode);

            // Create Edge from Root to Category
            edges.push({
                source: 'root',
                target: cat.id,
                length: 320,
                color: 'rgba(0, 243, 255, 0.25)',
                visible: false
            });

            // Tool Nodes (Level 2)
            const toolsCount = cat.tools.length;
            cat.tools.forEach((tool, tIndex) => {
                const toolAngle = (tIndex / toolsCount) * Math.PI * 2;
                const toolRadiusDist = 120 + Math.random() * 60;
                const toolX = catX + Math.cos(toolAngle) * toolRadiusDist;
                const toolY = catY + Math.sin(toolAngle) * toolRadiusDist;

                const toolNode = {
                    id: tool.id,
                    type: 'tool',
                    label: tool.name,
                    url: tool.url,
                    category: cat.name,
                    icon: '🔧',
                    x: toolX,
                    y: toolY,
                    vx: (Math.random() - 0.5) * 0.2,
                    vy: (Math.random() - 0.5) * 0.2,
                    radius: 12,
                    color: '#00ff9d',
                    glowColor: 'rgba(0, 255, 157, 0.5)',
                    parentId: cat.id,
                    visible: false,
                    toolData: tool
                };
                nodes.push(toolNode);

                // Create Edge from Category to Tool
                edges.push({
                    source: cat.id,
                    target: tool.id,
                    length: 120,
                    color: 'rgba(0, 255, 157, 0.2)',
                    visible: false
                });
            });
        });

        updateNodeVisibility();
        updateActiveNodeStats();
    }

    // Update Node & Edge Visibility Based on Expansion States
    function updateNodeVisibility() {
        const rootNode = nodes.find(n => n.id === 'root');
        rootNode.expanded = state.expandedRoot;

        nodes.forEach(node => {
            if (node.type === 'category') {
                node.visible = state.expandedRoot;
            } else if (node.type === 'tool') {
                node.visible = state.expandedRoot && state.expandedCategories.has(node.parentId);
            }
        });

        edges.forEach(edge => {
            const sourceNode = nodes.find(n => n.id === edge.source);
            const targetNode = nodes.find(n => n.id === edge.target);
            edge.visible = sourceNode && targetNode && sourceNode.visible && targetNode.visible;
        });

        updateActiveNodeStats();
    }

    function updateActiveNodeStats() {
        const visibleCount = nodes.filter(n => n.visible).length;
        const el = document.getElementById('stat-visible-nodes');
        if (el) el.textContent = visibleCount;
    }

    // ==========================================
    // 2. PHYSICS SIMULATION ENGINE
    // ==========================================

    function stepPhysics() {
        if (!state.physicsEnabled) return;

        const visibleNodes = nodes.filter(n => n.visible);

        // 1. Repulsive forces between nodes
        for (let i = 0; i < visibleNodes.length; i++) {
            for (let j = i + 1; j < visibleNodes.length; j++) {
                const n1 = visibleNodes[i];
                const n2 = visibleNodes[j];

                const dx = n2.x - n1.x;
                const dy = n2.y - n1.y;
                const distSq = dx * dx + dy * dy + 0.1;
                const dist = Math.sqrt(distSq);

                const minDist = n1.radius + n2.radius + (n1.type === 'root' ? 80 : 40);
                if (dist < minDist * 3) {
                    const force = (minDist * minDist) / distSq * 0.8;
                    const fx = (dx / dist) * force;
                    const fy = (dy / dist) * force;

                    if (n1 !== state.draggedNode && n1.type !== 'root') {
                        n1.vx -= fx;
                        n1.vy -= fy;
                    }
                    if (n2 !== state.draggedNode && n2.type !== 'root') {
                        n2.vx += fx;
                        n2.vy += fy;
                    }
                }
            }
        }

        // 2. Spring attractive forces along visible edges
        edges.forEach(edge => {
            if (!edge.visible) return;
            const source = nodes.find(n => n.id === edge.source);
            const target = nodes.find(n => n.id === edge.target);

            if (!source || !target) return;

            const dx = target.x - source.x;
            const dy = target.y - source.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;

            const displacement = dist - edge.length;
            const springForce = displacement * 0.008;

            const fx = (dx / dist) * springForce;
            const fy = (dy / dist) * springForce;

            if (source !== state.draggedNode && source.type !== 'root') {
                source.vx += fx;
                source.vy += fy;
            }
            if (target !== state.draggedNode && target.type !== 'root') {
                target.vx -= fx;
                target.vy -= fy;
            }
        });

        // 3. Update positions with damping
        visibleNodes.forEach(node => {
            if (node === state.draggedNode) return;
            if (node.type === 'root') return; // Root stays centered

            node.vx *= 0.85; // Velocity damping
            node.vy *= 0.85;

            node.x += node.vx;
            node.y += node.vy;
        });
    }

    // ==========================================
    // 3. CANVAS RENDER LOOP & GRAPH VISUALS
    // ==========================================

    let pulseOffset = 0;

    function renderGraph() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        // Camera Transform: Zoom & Pan
        ctx.translate(canvas.width / 2 + state.panX, canvas.height / 2 + state.panY);
        ctx.scale(state.zoom, state.zoom);
        ctx.translate(-canvas.width / 2, -canvas.height / 2);

        pulseOffset += 0.05;

        // Render Edges
        edges.forEach(edge => {
            if (!edge.visible) return;
            const source = nodes.find(n => n.id === edge.source);
            const target = nodes.find(n => n.id === edge.target);

            if (!source || !target) return;

            // Draw Connection Line
            ctx.beginPath();
            ctx.moveTo(source.x, source.y);
            ctx.lineTo(target.x, target.y);
            ctx.strokeStyle = edge.color;
            ctx.lineWidth = source.type === 'root' ? 2 : 1;
            ctx.stroke();

            // Animated Light Packet Pulse on Edges
            const packetPos = (pulseOffset % 1);
            const packetX = source.x + (target.x - source.x) * packetPos;
            const packetY = source.y + (target.y - source.y) * packetPos;

            ctx.beginPath();
            ctx.arc(packetX, packetY, source.type === 'root' ? 3 : 2, 0, Math.PI * 2);
            ctx.fillStyle = source.type === 'root' ? '#00f3ff' : '#00ff9d';
            ctx.shadowColor = source.type === 'root' ? '#00f3ff' : '#00ff9d';
            ctx.shadowBlur = 8;
            ctx.fill();
            ctx.shadowBlur = 0;
        });

        // Render Nodes
        nodes.forEach(node => {
            if (!node.visible) return;

            const isHovered = (state.hoveredNode === node);
            const isSelected = (state.selectedNode === node);
            const isStarred = state.favorites.has(node.id);

            // Halo Glow
            ctx.beginPath();
            ctx.arc(node.x, node.y, node.radius + (isHovered ? 10 : 4), 0, Math.PI * 2);
            ctx.fillStyle = node.glowColor;
            ctx.shadowColor = node.color;
            ctx.shadowBlur = isHovered ? 25 : 12;
            ctx.fill();
            ctx.shadowBlur = 0;

            // Main Node Circle
            ctx.beginPath();
            ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
            ctx.fillStyle = isHovered ? '#ffffff' : (node.type === 'root' ? '#07090e' : node.color);
            ctx.strokeStyle = node.color;
            ctx.lineWidth = isHovered ? 3 : 2;
            ctx.fill();
            ctx.stroke();

            // Node Icon / Symbol
            ctx.font = node.type === 'root' ? '22px sans-serif' : (node.type === 'category' ? '14px sans-serif' : '10px sans-serif');
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = node.type === 'root' ? '#00f3ff' : '#ffffff';
            ctx.fillText(node.icon, node.x, node.y);

            // Star Badge for Favorites
            if (isStarred) {
                ctx.font = '10px FontAwesome';
                ctx.fillStyle = '#ffab00';
                ctx.fillText('★', node.x + node.radius - 2, node.y - node.radius + 2);
            }

            // Node Text Label
            ctx.font = node.type === 'root' ? 'bold 16px Outfit, sans-serif' : (node.type === 'category' ? '600 13px Inter, sans-serif' : '400 11px Inter, sans-serif');
            ctx.textAlign = 'center';
            
            const labelText = node.label + (node.count ? ` (${node.count})` : '');
            const labelY = node.y + node.radius + 16;

            // Label Background Badge
            const textWidth = ctx.measureText(labelText).width;
            ctx.fillStyle = 'rgba(6, 7, 10, 0.85)';
            ctx.beginPath();
            ctx.roundRect(node.x - textWidth / 2 - 6, labelY - 10, textWidth + 12, 18, 4);
            ctx.fill();
            ctx.strokeStyle = isHovered ? node.color : 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Label Text
            ctx.fillStyle = isHovered ? '#ffffff' : (node.type === 'root' ? '#00f3ff' : (node.type === 'category' ? '#f0f4f8' : '#8a9bb0'));
            ctx.fillText(labelText, node.x, labelY + 3);
        });

        ctx.restore();

        stepPhysics();
        animationFrameId = requestAnimationFrame(renderGraph);
    }

    // ==========================================
    // 4. INTERACTIVE CANVAS MOUSE & TOUCH EVENTS
    // ==========================================

    function getCanvasCoordinates(e) {
        const rect = canvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;

        // Transform back through Camera Zoom & Pan
        const worldX = (screenX - canvas.width / 2 - state.panX) / state.zoom + canvas.width / 2;
        const worldY = (screenY - canvas.height / 2 - state.panY) / state.zoom + canvas.height / 2;

        return { screenX, screenY, worldX, worldY };
    }

    function findNodeAt(worldX, worldY) {
        const visibleNodes = nodes.filter(n => n.visible);
        // Reverse array so top rendered nodes match first
        for (let i = visibleNodes.length - 1; i >= 0; i--) {
            const node = visibleNodes[i];
            const dx = worldX - node.x;
            const dy = worldY - node.y;
            if (dx * dx + dy * dy <= (node.radius + 6) * (node.radius + 6)) {
                return node;
            }
        }
        return null;
    }

    let dragStartX = 0, dragStartY = 0;
    let panStartX = 0, panStartY = 0;

    canvas.addEventListener('mousedown', e => {
        const coords = getCanvasCoordinates(e);
        const node = findNodeAt(coords.worldX, coords.worldY);

        if (node) {
            state.draggedNode = node;
            dragStartX = coords.worldX;
            dragStartY = coords.worldY;
        } else {
            state.isPanning = true;
            panStartX = e.clientX - state.panX;
            panStartY = e.clientY - state.panY;
        }
    });

    canvas.addEventListener('mousemove', e => {
        const coords = getCanvasCoordinates(e);

        if (state.draggedNode) {
            state.draggedNode.x = coords.worldX;
            state.draggedNode.y = coords.worldY;
            state.draggedNode.vx = 0;
            state.draggedNode.vy = 0;
        } else if (state.isPanning) {
            state.panX = e.clientX - panStartX;
            state.panY = e.clientY - panStartY;
        } else {
            // Hover check
            const hovered = findNodeAt(coords.worldX, coords.worldY);
            state.hoveredNode = hovered;

            if (hovered) {
                showTooltip(hovered, coords.screenX, coords.screenY);
            } else {
                hideTooltip();
            }
        }
    });

    canvas.addEventListener('mouseup', e => {
        const coords = getCanvasCoordinates(e);

        if (state.draggedNode) {
            // If mouse moved very little, treat as click
            const dist = Math.hypot(coords.worldX - dragStartX, coords.worldY - dragStartY);
            if (dist < 5) {
                handleNodeClick(state.draggedNode);
            }
            state.draggedNode = null;
        }

        state.isPanning = false;
    });

    // Zoom Wheel Event
    canvas.addEventListener('wheel', e => {
        e.preventDefault();
        const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
        const newZoom = Math.max(0.2, Math.min(3.0, state.zoom * zoomFactor));
        state.zoom = newZoom;
    }, { passive: false });

    // Node Click Expansion & Viewer Trigger
    function handleNodeClick(node) {
        state.selectedNode = node;

        if (node.type === 'root') {
            state.expandedRoot = !state.expandedRoot;
            if (!state.expandedRoot) {
                state.expandedCategories.clear();
            }
            updateNodeVisibility();
            showToast(state.expandedRoot ? 'Expanded all OSINT categories' : 'Collapsed categories to ROSIMS root');
        } else if (node.type === 'category') {
            if (state.expandedCategories.has(node.id)) {
                state.expandedCategories.delete(node.id);
            } else {
                state.expandedCategories.add(node.id);
            }
            updateNodeVisibility();
            showToast(`${state.expandedCategories.has(node.id) ? 'Expanded' : 'Collapsed'} ${node.label} (${node.count} tools)`);
        } else if (node.type === 'tool') {
            openToolViewer(node.toolData);
        }
    }

    // Smooth Recenter on Node
    function recenterNode(node) {
        state.panX = (canvas.width / 2 - node.x) * state.zoom;
        state.panY = (canvas.height / 2 - node.y) * state.zoom;
    }

    // ==========================================
    // 5. TOOLTIP & TOAST SYSTEM
    // ==========================================

    function showTooltip(node, x, y) {
        document.getElementById('tooltip-icon').textContent = node.icon;
        document.getElementById('tooltip-title').textContent = node.label;
        document.getElementById('tooltip-tag').textContent = node.type.toUpperCase();
        
        let desc = 'Click node to expand or collapse.';
        let action = 'Click to expand';
        if (node.type === 'tool') {
            desc = `URL: ${node.url}`;
            action = 'Click to open in Embedded Viewer';
        } else if (node.type === 'category') {
            desc = `Contains ${node.count} specialized OSINT tools.`;
            action = state.expandedCategories.has(node.id) ? 'Click to collapse tools' : 'Click to expand tools';
        } else if (node.type === 'root') {
            desc = 'Core ROSIMS Intelligence Hub';
            action = state.expandedRoot ? 'Click to collapse mesh' : 'Click to explode categories';
        }

        document.getElementById('tooltip-desc').textContent = desc;
        document.getElementById('tooltip-action-hint').textContent = action;

        tooltip.style.left = `${x}px`;
        tooltip.style.top = `${y - 10}px`;
        tooltip.classList.remove('hidden');
    }

    function hideTooltip() {
        tooltip.classList.add('hidden');
    }

    function showToast(message) {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<i class="fa-solid fa-circle-check" style="color: var(--neon-emerald)"></i> <span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // ==========================================
    // 6. EMBEDDED TOOL VIEWER DRAWER LOGIC
    // ==========================================

    function openToolViewer(tool) {
        state.activeViewerTool = tool;

        document.getElementById('viewer-icon').textContent = '🔧';
        document.getElementById('viewer-title').textContent = tool.name;
        document.getElementById('viewer-category').textContent = tool.category;
        document.getElementById('viewer-url-display').textContent = tool.url;

        // Set Direct Links & Quick OSINT Helper Links
        const launchBtn = document.getElementById('viewer-launch-link');
        launchBtn.href = tool.url;

        const domainMatch = tool.url.match(/^https?:\/\/([^/]+)/);
        const domain = domainMatch ? domainMatch[1] : tool.url;

        document.getElementById('osint-wayback').href = `https://web.archive.org/web/*/${tool.url}`;
        document.getElementById('osint-whois').href = `https://whois.domaintools.com/${domain}`;
        document.getElementById('osint-urlscan').href = `https://urlscan.io/domain/${domain}`;
        document.getElementById('osint-virustotal').href = `https://www.virustotal.com/gui/domain/${domain}`;

        // Starred State
        updateFavBtnState();

        // Show Drawer & Load iFrame
        viewerDrawer.classList.remove('hidden');
        iframeLoader.classList.remove('hidden');
        iframeFallback.classList.add('hidden');

        toolIframe.src = tool.url;

        // iFrame Load Timeout Handler (Detect X-Frame-Options blocks)
        const loadTimer = setTimeout(() => {
            iframeLoader.classList.add('hidden');
        }, 1500);

        toolIframe.onload = () => {
            clearTimeout(loadTimer);
            iframeLoader.classList.add('hidden');
        };

        toolIframe.onerror = () => {
            clearTimeout(loadTimer);
            iframeLoader.classList.add('hidden');
            document.getElementById('fallback-open-btn').href = tool.url;
            iframeFallback.classList.remove('hidden');
        };
    }

    function updateFavBtnState() {
        const favBtn = document.getElementById('viewer-fav-btn');
        if (!state.activeViewerTool) return;

        const isStarred = state.favorites.has(state.activeViewerTool.id);
        favBtn.innerHTML = isStarred ? '<i class="fa-solid fa-star" style="color: var(--neon-amber)"></i>' : '<i class="fa-regular fa-star"></i>';
    }

    // ==========================================
    // 7. OSINT LIVE SEARCH ENGINE
    // ==========================================

    function renderSearchResults(query = '', categoryFilter = 'all') {
        searchResults.innerHTML = '';

        const cleanQuery = query.toLowerCase().trim();
        let matches = [];

        ROSIMS_DATA.forEach(cat => {
            if (categoryFilter !== 'all') {
                const cName = cat.name.toLowerCase();
                if (categoryFilter === 'phone' && !cName.includes('phone') && !cName.includes('contact')) return;
                if (categoryFilter === 'id' && !cName.includes('id') && !cName.includes('username') && !cName.includes('person')) return;
                if (categoryFilter === 'social' && !cName.includes('social') && !cName.includes('profile')) return;
                if (categoryFilter === 'domain' && !cName.includes('domain') && !cName.includes('dns') && !cName.includes('network') && !cName.includes('ip')) return;
                if (categoryFilter === 'dark' && !cName.includes('dark') && !cName.includes('tor') && !cName.includes('privacy')) return;
                if (categoryFilter === 'threat' && !cName.includes('threat') && !cName.includes('intel') && !cName.includes('sec')) return;
            }

            cat.tools.forEach(tool => {
                if (!cleanQuery || tool.name.toLowerCase().includes(cleanQuery) || tool.url.toLowerCase().includes(cleanQuery) || cat.name.toLowerCase().includes(cleanQuery)) {
                    matches.push(tool);
                }
            });
        });

        if (matches.length === 0) {
            searchResults.innerHTML = `<div style="padding: 30px; text-align: center; color: var(--text-muted);">No OSINT tools matching "${query}"</div>`;
            return;
        }

        // Limit results to 100 for fast UI rendering
        matches.slice(0, 100).forEach(tool => {
            const item = document.createElement('div');
            item.className = 'search-item';
            item.innerHTML = `
                <div class="search-item-info">
                    <span class="search-item-title">${tool.name}</span>
                    <span class="search-item-cat">${tool.category}</span>
                    <span class="search-item-url">${tool.url}</span>
                </div>
                <button class="cyber-btn" style="padding: 4px 10px; font-size: 11px;"><i class="fa-solid fa-eye"></i> View</button>
            `;

            item.addEventListener('click', () => {
                searchModal.classList.add('hidden');
                
                // Expand category & focus node
                const catNode = nodes.find(n => n.label === tool.category);
                if (catNode) {
                    state.expandedRoot = true;
                    state.expandedCategories.add(catNode.id);
                    updateNodeVisibility();
                    
                    const toolNode = nodes.find(n => n.id === tool.id);
                    if (toolNode) {
                        recenterNode(toolNode);
                    }
                }

                openToolViewer(tool);
            });

            searchResults.appendChild(item);
        });
    }

    // ==========================================
    // 8. FAVORITES & SCRATCHPAD PERSISTENCE
    // ==========================================

    function toggleFavorite(toolId) {
        if (state.favorites.has(toolId)) {
            state.favorites.delete(toolId);
            showToast('Removed from Favorites');
        } else {
            state.favorites.add(toolId);
            showToast('Added to Favorites');
        }

        localStorage.setItem('ROSIMS_FAVS', JSON.stringify(Array.from(state.favorites)));
        updateFavsCount();
        updateFavBtnState();
        renderFavsList();
    }

    function updateFavsCount() {
        const el = document.getElementById('fav-count');
        if (el) el.textContent = state.favorites.size;
    }

    function renderFavsList() {
        favsListContainer.innerHTML = '';
        if (state.favorites.size === 0) {
            favsListContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 12px; text-align: center; padding: 20px;">No pinned OSINT tools yet. Click the star icon on any tool drawer to pin!</p>';
            return;
        }

        state.favorites.forEach(favId => {
            const node = nodes.find(n => n.id === favId && n.type === 'tool');
            if (!node) return;

            const tool = node.toolData;
            const card = document.createElement('div');
            card.className = 'search-item';
            card.innerHTML = `
                <div class="search-item-info">
                    <span class="search-item-title">${tool.name}</span>
                    <span class="search-item-cat">${tool.category}</span>
                </div>
                <button class="drawer-btn" style="padding: 4px 8px; font-size: 11px;"><i class="fa-solid fa-arrow-up-right-from-square"></i> Open</button>
            `;

            card.addEventListener('click', () => {
                favsDrawer.classList.add('hidden');
                openToolViewer(tool);
            });

            favsListContainer.appendChild(card);
        });
    }

    // ==========================================
    // 9. EVENT LISTENERS & SETUP
    // ==========================================

    function setupEventListeners() {
        // Window Resize Canvas Autofit
        window.addEventListener('resize', resizeCanvas);

        // Header Brand Click: Recenter on ROSIMS Root
        document.getElementById('brand-home-btn').addEventListener('click', () => {
            const rootNode = nodes.find(n => n.id === 'root');
            recenterNode(rootNode);
            showToast('Recentered on ROSIMS Core Node');
        });

        // Graph HUD Buttons
        document.getElementById('btn-zoom-in').addEventListener('click', () => {
            state.zoom = Math.min(3.0, state.zoom * 1.2);
        });

        document.getElementById('btn-zoom-out').addEventListener('click', () => {
            state.zoom = Math.max(0.2, state.zoom / 1.2);
        });

        document.getElementById('btn-reset-view').addEventListener('click', () => {
            state.zoom = 1;
            state.panX = 0;
            state.panY = 0;
        });

        document.getElementById('btn-expand-all').addEventListener('click', () => {
            state.expandedRoot = true;
            ROSIMS_DATA.forEach(cat => state.expandedCategories.add(cat.id));
            updateNodeVisibility();
            showToast('Expanded all 78 OSINT Categories & Tools');
        });

        document.getElementById('btn-collapse-all').addEventListener('click', () => {
            state.expandedRoot = false;
            state.expandedCategories.clear();
            updateNodeVisibility();
            showToast('Collapsed mesh to ROSIMS Root');
        });

        document.getElementById('btn-toggle-physics').addEventListener('click', e => {
            state.physicsEnabled = !state.physicsEnabled;
            e.currentTarget.classList.toggle('active', state.physicsEnabled);
            showToast(`Physics Simulation ${state.physicsEnabled ? 'Enabled' : 'Paused'}`);
        });

        // Search Engine Modal Listeners
        const openSearchBtn = document.getElementById('open-search-btn');
        const closeSearchBtn = document.getElementById('close-search-btn');

        openSearchBtn.addEventListener('click', () => {
            searchModal.classList.remove('hidden');
            searchInput.focus();
            renderSearchResults();
        });

        closeSearchBtn.addEventListener('click', () => searchModal.classList.add('hidden'));

        searchInput.addEventListener('input', e => {
            renderSearchResults(e.target.value);
        });

        // Category Filter Pills in Search Modal
        searchCategoryFilters.addEventListener('click', e => {
            if (e.target.classList.contains('filter-pill')) {
                document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
                e.target.classList.add('active');
                renderSearchResults(searchInput.value, e.target.dataset.cat);
            }
        });

        // Keyboard Shortcuts (Ctrl+K, Esc, Space)
        window.addEventListener('keydown', e => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                searchModal.classList.remove('hidden');
                searchInput.focus();
                renderSearchResults();
            } else if (e.key === 'Escape') {
                searchModal.classList.add('hidden');
                viewerDrawer.classList.add('hidden');
                scratchpadDrawer.classList.add('hidden');
                favsDrawer.classList.add('hidden');
                helpModal.classList.add('hidden');
            }
        });

        // Tool Viewer Actions
        document.getElementById('viewer-close-btn').addEventListener('click', () => viewerDrawer.classList.add('hidden'));
        
        document.getElementById('viewer-expand-btn').addEventListener('click', () => {
            viewerDrawer.classList.toggle('fullscreen');
        });

        document.getElementById('viewer-copy-btn').addEventListener('click', () => {
            if (state.activeViewerTool) {
                navigator.clipboard.writeText(state.activeViewerTool.url);
                showToast('URL Copied to Clipboard!');
            }
        });

        document.getElementById('viewer-fav-btn').addEventListener('click', () => {
            if (state.activeViewerTool) {
                toggleFavorite(state.activeViewerTool.id);
            }
        });

        document.getElementById('insert-note-btn').addEventListener('click', () => {
            if (state.activeViewerTool) {
                const noteLine = `\n- [${state.activeViewerTool.name}] (${state.activeViewerTool.url}) - Category: ${state.activeViewerTool.category}`;
                intelNotesInput.value += noteLine;
                localStorage.setItem('ROSIMS_NOTES', intelNotesInput.value);
                showToast('Added tool reference to Intel Notes');
            }
        });

        // Scratchpad Intel Notes Listeners
        document.getElementById('open-scratchpad-btn').addEventListener('click', () => {
            scratchpadDrawer.classList.toggle('hidden');
        });
        document.getElementById('close-scratchpad-btn').addEventListener('click', () => scratchpadDrawer.classList.add('hidden'));

        intelNotesInput.value = state.notes;
        intelNotesInput.addEventListener('input', e => {
            localStorage.setItem('ROSIMS_NOTES', e.target.value);
        });

        document.getElementById('export-notes-btn').addEventListener('click', () => {
            const blob = new Blob([intelNotesInput.value], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ROSIMS_Intel_Notes_${new Date().toISOString().slice(0, 10)}.txt`;
            a.click();
            URL.revokeObjectURL(url);
            showToast('Exported Intel Notes!');
        });

        document.getElementById('clear-notes-btn').addEventListener('click', () => {
            if (confirm('Clear all intel notes?')) {
                intelNotesInput.value = '';
                localStorage.setItem('ROSIMS_NOTES', '');
                showToast('Notes Cleared');
            }
        });

        // Favorites Drawer Listeners
        document.getElementById('open-favs-btn').addEventListener('click', () => {
            renderFavsList();
            favsDrawer.classList.toggle('hidden');
        });
        document.getElementById('close-favs-btn').addEventListener('click', () => favsDrawer.classList.add('hidden'));

        // Help Modal Listeners
        document.getElementById('toggle-help-btn').addEventListener('click', () => helpModal.classList.remove('hidden'));
        document.getElementById('close-help-btn').addEventListener('click', () => helpModal.classList.add('hidden'));
        document.getElementById('help-dismiss-btn').addEventListener('click', () => helpModal.classList.add('hidden'));
    }

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    // ==========================================
    // 10. APP INITIALIZATION BOOTSTRAP
    // ==========================================

    function initApp() {
        resizeCanvas();
        initGraph();
        setupEventListeners();
        updateFavsCount();
        renderGraph();

        console.log('ROSIMS OSINT System Initialized with 1,457 Tools across 78 Categories.');
    }

    // Run on DOM Ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }

})();
