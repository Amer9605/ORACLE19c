import { addLogEntry } from './utils.js';
import { initArchitectureSVG, updateArchitecture, animateDataFlow } from './architecture.js';
import { initDataGuardSVG, simulateRedoTransport, performSwitchoverVisuals, performFailoverVisuals } from './dataguard.js';

const state = {
    primaryStatus: 'UP',
    standbyStatus: 'UP',
    scn: 1000000,
    standbyScn: 1000000,
    redoBufferLevel: 0,
    dirtyBuffers: 0,
    applyQueue: 0
};

document.addEventListener('DOMContentLoaded', () => {
    initArchitectureSVG('arch-container');
    initDataGuardSVG('dg-container');
    addLogEntry('Oracle 19c & Data Guard Simulator Initialized.', 'success');
    
    // UI Event Listeners
    document.getElementById('slide-latency').addEventListener('input', (e) => document.getElementById('val-latency').textContent = e.target.value);
    
    document.getElementById('btn-select').addEventListener('click', executeSelect);
    document.getElementById('btn-update').addEventListener('click', executeUpdate);
    document.getElementById('btn-ckpt').addEventListener('click', forceCheckpoint);
    document.getElementById('btn-logswitch').addEventListener('click', switchRedoLog);
    document.getElementById('btn-awr').addEventListener('click', awrSnapshot);
    document.getElementById('btn-im').addEventListener('click', populateIM);
    
    document.getElementById('btn-failover').addEventListener('click', simulatePrimaryFailure);
    document.getElementById('btn-switchover').addEventListener('click', executeSwitchover);
    
    setInterval(simulateMMNL, 5000);
});

function updateSCN(amount) {
    state.scn += amount;
    document.getElementById('scn-counter').textContent = state.scn;
    updateLag();
}

function updateLag() {
    const lag = state.scn - state.standbyScn;
    const badge = document.getElementById('lag-indicator');
    badge.textContent = lag === 0 ? 'In Sync (Lag: 0)' : `Apply Lag: ${lag}`;
    badge.className = lag === 0 ? 'lag-badge' : 'lag-badge error';
}

function executeSelect() {
    if(state.primaryStatus !== 'UP') return addLogEntry('Primary is DOWN!', 'error');
    addLogEntry('Session executing SQL SELECT...', 'highlight');
    
    const isHit = Math.random() > 0.3;
    setTimeout(() => {
        if(isHit) {
            addLogEntry('Soft Parse. Buffer Cache Hit.', 'success');
            animateDataFlow('arch_BufferCache', 'read');
        } else {
            addLogEntry('Hard Parse. Buffer Cache Miss. Physical Read.', 'warn');
            animateDataFlow('disk_DataFiles', 'read');
            animateDataFlow('arch_BufferCache', 'read');
        }
    }, 400);
}

function executeUpdate() {
    if(state.primaryStatus !== 'UP') return addLogEntry('Primary is DOWN!', 'error');
    
    const burst = parseInt(document.getElementById('slide-dml').value);
    addLogEntry(`Executing DML burst (Intensity: ${burst})...`, 'highlight');
    
    state.dirtyBuffers += burst;
    state.redoBufferLevel += burst * 2.5;
    animateDataFlow('arch_BufferCache', 'write');
    updateArchitecture(state);
    
    if(state.redoBufferLevel >= 100) {
        addLogEntry('Redo Log Buffer 1/3 full. LGWR activated.', 'warn');
        state.redoBufferLevel = 0;
        updateArchitecture(state);
        animateDataFlow('proc_LGWR', 'write');
        animateDataFlow('disk_OnlineRedo', 'write');
        updateSCN(Math.floor(Math.random() * 50) + 10);
        triggerTransport();
    }
}

function triggerTransport() {
    if(state.standbyStatus !== 'UP') return;
    const latency = parseInt(document.getElementById('slide-latency').value);
    const mode = document.getElementById('sel-protection').value;
    
    addLogEntry(`LGWR shipping redo payload (${mode})...`, 'info');
    simulateRedoTransport(latency + 400);
    
    setTimeout(() => {
        state.applyQueue++;
        addLogEntry('RFS received redo payload.', 'success');
        applyRedo();
    }, latency + 400);
}

function applyRedo() {
    if(state.applyQueue > 0) {
        addLogEntry('MRP applying redo to Standby...', 'info');
        setTimeout(() => {
            state.applyQueue--;
            state.standbyScn = state.scn;
            updateLag();
            addLogEntry('MRP apply complete. Standby in sync.', 'success');
        }, 800);
    }
}

function forceCheckpoint() {
    if(state.primaryStatus !== 'UP') return;
    addLogEntry('ALTER SYSTEM CHECKPOINT triggered.', 'highlight');
    animateDataFlow('proc_CKPT', 'write');
    
    setTimeout(() => {
        if(state.dirtyBuffers > 0) {
            addLogEntry(`DBWn writing ${state.dirtyBuffers} dirty buffers to disk.`, 'info');
            animateDataFlow('proc_DBWn', 'write');
            animateDataFlow('disk_DataFiles', 'write');
            state.dirtyBuffers = 0;
        } else {
            addLogEntry('No dirty buffers to write.', 'info');
        }
    }, 600);
}

function switchRedoLog() {
    if(state.primaryStatus !== 'UP') return;
    addLogEntry('ALTER SYSTEM SWITCH LOGFILE.', 'highlight');
    animateDataFlow('proc_LGWR', 'write');
    setTimeout(() => {
        addLogEntry('ARCn creating Archived Redo Log.', 'info');
        animateDataFlow('proc_ARCn', 'write');
        animateDataFlow('disk_ArchiveLogs', 'write');
    }, 600);
}

function awrSnapshot() {
    if(state.primaryStatus !== 'UP') return;
    addLogEntry('MMON capturing AWR Snapshot.', 'info');
    animateDataFlow('proc_MMON', 'read');
}

function populateIM() {
    if(state.primaryStatus !== 'UP') return;
    addLogEntry('IMCO populating In-Memory Column Store.', 'info');
    animateDataFlow('arch_InMemory', 'write');
}

function simulateMMNL() {
    if(state.primaryStatus === 'UP') addLogEntry('MMNL flushing ASH buffer (simulated background task).', 'info');
}

function simulatePrimaryFailure() {
    addLogEntry('!!! PRIMARY INSTANCE CRASHED !!!', 'error');
    state.primaryStatus = 'DOWN';
    document.getElementById('left-title').textContent = 'FAILED PRIMARY';
    document.getElementById('left-title').style.color = '#ef4444';
    performFailoverVisuals();
    
    const btn = document.getElementById('btn-failover');
    btn.textContent = 'Activate Standby';
    btn.className = 'warning';
    btn.onclick = executeFailover;
}

function executeFailover() {
    addLogEntry('Executing Failover. Standby applying remaining redo.', 'warn');
    applyRedo();
    setTimeout(() => {
        addLogEntry('Standby transitioning to PRIMARY role.', 'success');
        state.standbyStatus = 'PRIMARY';
        document.getElementById('right-title').textContent = 'NEW PRIMARY';
        document.getElementById('btn-failover').disabled = true;
    }, 1500);
}

function executeSwitchover() {
    if(state.primaryStatus !== 'UP' || state.standbyStatus !== 'UP') return addLogEntry('Instances must be UP for Switchover.', 'error');
    addLogEntry('Initiating graceful Switchover...', 'warn');
    
    setTimeout(() => {
        addLogEntry('Primary shipping End-Of-Redo to Standby.', 'info');
        setTimeout(() => {
            addLogEntry('Target Standby applying all redo.', 'info');
            state.standbyScn = state.scn;
            updateLag();
            setTimeout(() => {
                addLogEntry('Target opened read/write as new Primary.', 'success');
                performSwitchoverVisuals();
            }, 1000);
        }, 1000);
    }, 1000);
}
