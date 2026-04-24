import { createSVGRect, createSVGText, showTooltip, hideTooltip } from './utils.js';

let svg;
let redoFillBar;

export function initArchitectureSVG(containerId) {
    const container = document.getElementById(containerId);
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 1000 750');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    
    // Server Process & PGA
    drawProcess(80, 160, 'User', '#6366f1', 'Foreground User Session', false);
    drawComponent(150, 120, 110, 80, 'PGA', 'PGA', '#f59e0b', 'Program Global Area: SQL Work Areas, Private SQL Area.');
    
    // SGA Base Container
    const sgaGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    sgaGroup.id = 'arch_SGA';
    sgaGroup.appendChild(createSVGRect(280, 50, 700, 360, 10, 'rgba(59, 130, 246, 0.05)', '#3b82f6', 2));
    sgaGroup.appendChild(createSVGText(630, 40, 'System Global Area (SGA)', '#93c5fd', 16));
    svg.appendChild(sgaGroup);
    
    // SGA Subcomponents
    drawComponent(300, 70, 240, 90, 'SharedPool', 'Shared Pool', '#3b82f6', 'Library Cache, Data Dictionary Cache.');
    drawComponent(560, 70, 130, 90, 'LargePool', 'Large Pool', '#6366f1', 'UGA, I/O buffers.');
    drawComponent(710, 70, 120, 90, 'JavaPool', 'Java Pool', '#8b5cf6', 'Memory for JVM.');
    drawComponent(850, 70, 110, 90, 'Streams', 'Streams Pool', '#a855f7', 'Oracle Streams.');
    
    drawComponent(300, 180, 400, 100, 'BufferCache', 'Database Buffer Cache', '#10b981', 'Caches data blocks. DBWn writes dirty buffers.');
    drawComponent(720, 180, 240, 100, 'InMemory', 'In-Memory Area', '#ec4899', 'IM column store - IMCU, SMU, IMEU.');
    
    // Redo Log Buffer with Fill Bar
    const redoGrp = drawComponent(300, 310, 660, 60, 'RedoBuffer', 'Redo Log Buffer', '#ef4444', 'Circular buffer holding redo entries.');
    redoFillBar = createSVGRect(300, 310, 0, 60, 8, 'rgba(239, 68, 68, 0.5)', 'none', 0);
    redoGrp.insertBefore(redoFillBar, redoGrp.childNodes[1]); 
    
    // Background Processes (Top of Disk row)
    const procs = [
        {id: 'PMON', x: 330}, {id: 'SMON', x: 410}, {id: 'DBWn', x: 490, color: '#10b981'},
        {id: 'LGWR', x: 570, color: '#ef4444'}, {id: 'CKPT', x: 650, color: '#f59e0b'},
        {id: 'ARCn', x: 730, color: '#0ea5e9'}, {id: 'MMON', x: 810}, {id: 'RECO', x: 890}
    ];
    procs.forEach(p => drawProcess(p.x, 480, p.id, p.color || '#64748b', `Background Process: ${p.id}`, true));
    
    // Physical Disks
    drawDisk(300, 600, 'DataFiles', 'Data Files', '#10b981');
    drawDisk(450, 600, 'ControlFiles', 'Control Files', '#f59e0b');
    drawDisk(600, 600, 'OnlineRedo', 'Online Redo Logs', '#ef4444');
    drawDisk(750, 600, 'ArchiveLogs', 'Archived Redo', '#0ea5e9');

    container.appendChild(svg);
}

function drawComponent(x, y, w, h, id, title, color, desc) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.id = `arch_${id}`;
    g.style.cursor = 'pointer';
    
    const rect = createSVGRect(x, y, w, h, 8, 'rgba(15, 23, 42, 0.8)', color, 2);
    const text = createSVGText(x + w/2, y + h/2 + 5, title, '#fff', 14);
    
    g.appendChild(rect); g.appendChild(text);
    g.addEventListener('mouseenter', (e) => showTooltip(e, title, desc));
    g.addEventListener('mouseleave', hideTooltip);
    svg.appendChild(g);
    return g;
}

function drawProcess(x, y, title, color, desc, isBg) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.id = `proc_${title}`;
    g.style.cursor = 'pointer';
    
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', x); circle.setAttribute('cy', y);
    circle.setAttribute('r', isBg ? 28 : 35);
    circle.setAttribute('fill', 'rgba(15,23,42,0.9)');
    circle.setAttribute('stroke', color);
    circle.setAttribute('stroke-width', 2);
    
    const text = createSVGText(x, y + 4, title, '#fff', isBg ? 12 : 14);
    
    g.appendChild(circle); g.appendChild(text);
    g.addEventListener('mouseenter', (e) => showTooltip(e, title, desc));
    g.addEventListener('mouseleave', hideTooltip);
    svg.appendChild(g);
}

function drawDisk(x, y, id, title, color) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.id = `disk_${id}`;
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M${x},${y+20} A55,15 0 0,0 ${x+110},${y+20} L${x+110},${y+100} A55,15 0 0,1 ${x},${y+100} Z`);
    path.setAttribute('fill', 'rgba(15,23,42,0.9)');
    path.setAttribute('stroke', color);
    path.setAttribute('stroke-width', 2);
    
    const top = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    top.setAttribute('cx', x+55); top.setAttribute('cy', y+20);
    top.setAttribute('rx', 55); top.setAttribute('ry', 15);
    top.setAttribute('fill', 'rgba(15,23,42,0.9)');
    top.setAttribute('stroke', color);
    top.setAttribute('stroke-width', 2);
    
    const text = createSVGText(x + 55, y + 65, title, '#fff', 13);
    
    g.appendChild(path); g.appendChild(top); g.appendChild(text);
    g.addEventListener('mouseenter', (e) => showTooltip(e, title, 'Physical DB storage layer.'));
    g.addEventListener('mouseleave', hideTooltip);
    svg.appendChild(g);
}

export function updateArchitecture(state) {
    const fillPercent = Math.min(state.redoBufferLevel / 100, 1);
    redoFillBar.setAttribute('width', 660 * fillPercent);
}

export function animateDataFlow(targetId, type) {
    const el = document.getElementById(targetId);
    if(el) {
        el.classList.add(`glow-${type === 'write' ? 'red' : 'green'}`);
        setTimeout(() => el.classList.remove(`glow-${type === 'write' ? 'red' : 'green'}`), 800);
    }
}
