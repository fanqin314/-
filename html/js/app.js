// ========================================================================
// App — 工具函数 + 导航 + 初始化
// ========================================================================

// ---------- 工具函数 ----------
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// 给 mcData 每个题目分配稳定的全局索引，保证跨过滤模式 key 一致
if (typeof mcData !== 'undefined') {
    mcData.forEach(function(q, i) { q._globalIdx = i; });
}

function unitBadge(unit) {
    return '<span class="badge badge-u' + unit + '">Unit ' + unit + '</span>';
}

function loadStored(key, def) {
    try { return JSON.parse(localStorage.getItem(key)) || def; }
    catch { return def; }
}

function saveStored(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
}

// ---------- 导航 ----------
document.querySelectorAll('.nav a').forEach(function(link) {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        document.querySelectorAll('.nav a').forEach(function(a) { a.classList.remove('active'); });
        this.classList.add('active');
        document.querySelectorAll('.section').forEach(function(s) { s.classList.remove('active'); });
        document.getElementById('sec-' + this.dataset.section).classList.add('active');
        saveSessionState();
    });
});

// ---------- 单元标签 ----------
document.querySelectorAll('.unit-tabs').forEach(function(tabGroup) {
    tabGroup.querySelectorAll('button').forEach(function(btn) {
        btn.addEventListener('click', function() {
            tabGroup.querySelectorAll('button').forEach(function(b) { b.classList.remove('active'); });
            this.classList.add('active');
            var ps = this.closest('.section');
            if (ps.id === 'sec-mc') renderMC(this.dataset.unit);
            else if (ps.id === 'sec-exp') renderExp(this.dataset.unit);
        });
    });
});

// ---------- 统一折叠控制区 ----------
var allCollapsed = false;

function toggleAllControls() {
    allCollapsed = !allCollapsed;
    var btn = document.querySelector('.nav-ctl-all');
    ['mcControls', 'expControls', 'transControls'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) {
            if (allCollapsed) el.classList.add('collapsed');
            else el.classList.remove('collapsed');
        }
    });
    btn.innerHTML = allCollapsed ? '<span class="ctl-icon">▽</span> 展开' : '<span class="ctl-icon">▽</span> 收起';
    btn.classList.toggle('collapsed', allCollapsed);
    saveSessionState();
}

// ---------- 会话持久化 ----------
var SESSION_KEY = 'engReviewSession';

function saveSessionState() {
    var state = {
        activeSection: document.querySelector('.nav a.active')?.dataset?.section || 'mc',
        mcUnit: document.querySelector('#sec-mc .unit-tabs .active')?.dataset?.unit || 'all',
        expUnit: document.querySelector('#sec-exp .unit-tabs .active')?.dataset?.unit || 'all',
        mcCardMode: typeof mcCardMode !== 'undefined' ? mcCardMode : false,
        expCardMode: typeof expCardMode !== 'undefined' ? expCardMode : false,
        mcCardIdx: typeof mcCardIdx !== 'undefined' ? mcCardIdx : 0,
        expCardIdx: typeof expCardIdx !== 'undefined' ? expCardIdx : 0,
        mcShowMode: typeof mcShowMode !== 'undefined' ? mcShowMode : 'sentence',
        expShowMode: typeof expShowMode !== 'undefined' ? expShowMode : 'sentence',
        mcShowHint: typeof mcShowHint !== 'undefined' ? mcShowHint : false,
        mcWrongOnly: typeof mcWrongOnly !== 'undefined' ? mcWrongOnly : false,
        mcWrongSnapshot: typeof mcWrongSnapshot !== 'undefined' ? mcWrongSnapshot : [],
        expShowHint: typeof expShowHint !== 'undefined' ? expShowHint : false,
        transMode: typeof transMode !== 'undefined' ? transMode : 0,
        allCollapsed: allCollapsed,
    };
    saveStored(SESSION_KEY, state);
}

function restoreSessionState() {
    var state = loadStored(SESSION_KEY, null);
    if (!state) return;
    allCollapsed = state.allCollapsed || false;

    // 恢复折叠状态
    if (allCollapsed) {
        ['mcControls', 'expControls', 'transControls'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.classList.add('collapsed');
        });
        var btn = document.querySelector('.nav-ctl-all');
        if (btn) { btn.classList.add('collapsed'); btn.innerHTML = '<span class="ctl-icon">▽</span> 展开'; }
    }

    // 恢复导航
    var navLink = document.querySelector('.nav a[data-section="' + state.activeSection + '"]');
    if (navLink) {
        document.querySelectorAll('.nav a').forEach(function(a) { a.classList.remove('active'); });
        navLink.classList.add('active');
        document.querySelectorAll('.section').forEach(function(s) { s.classList.remove('active'); });
        document.getElementById('sec-' + state.activeSection).classList.add('active');
    }

    // 恢复 MC 单元标签
    var mcTab = document.querySelector('#sec-mc .unit-tabs button[data-unit="' + (state.mcUnit || 'all') + '"]');
    if (mcTab) { document.querySelectorAll('#sec-mc .unit-tabs button').forEach(function(b) { b.classList.remove('active'); }); mcTab.classList.add('active'); }

    // 恢复 Exp 单元标签
    var expTab = document.querySelector('#sec-exp .unit-tabs button[data-unit="' + (state.expUnit || 'all') + '"]');
    if (expTab) { document.querySelectorAll('#sec-exp .unit-tabs button').forEach(function(b) { b.classList.remove('active'); }); expTab.classList.add('active'); }

    // 恢复布尔状态
    if (typeof mcCardMode !== 'undefined') mcCardMode = state.mcCardMode;
    if (typeof expCardMode !== 'undefined') expCardMode = state.expCardMode;
    if (typeof mcCardIdx !== 'undefined') mcCardIdx = state.mcCardIdx;
    if (typeof expCardIdx !== 'undefined') expCardIdx = state.expCardIdx;
    if (typeof mcShowMode !== 'undefined') mcShowMode = state.mcShowMode;
    if (typeof expShowMode !== 'undefined') expShowMode = state.expShowMode;
    if (typeof mcShowHint !== 'undefined') mcShowHint = state.mcShowHint;
    if (typeof mcWrongOnly !== 'undefined') mcWrongOnly = state.mcWrongOnly;
    if (typeof mcWrongSnapshot !== 'undefined') mcWrongSnapshot = state.mcWrongSnapshot || [];
    if (typeof expShowHint !== 'undefined') expShowHint = state.expShowHint;
    if (typeof transMode !== 'undefined') transMode = state.transMode;
}
