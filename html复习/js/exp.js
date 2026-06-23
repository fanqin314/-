// ========================================================================
// 短语完形 (Exp) — 记忆卡版
// ========================================================================
var expState = loadStored('expState', {});
var expShowMode = 'sentence';
var expShowHint = false;
var expCardMode = false;
var expCardIdx = 0;
var expMastery = loadStored('expMastery', {});

function updateExpMasteredUI() {
    document.getElementById('expMastered').textContent = Object.values(expMastery).filter(function(v) { return v; }).length;
}

function renderExp(unitFilter) {
    var container = document.getElementById('expContainer');
    container.innerHTML = '';
    var filtered = unitFilter === 'all' ? expData : expData.filter(function(q) { return q.unit === parseInt(unitFilter); });
    if (expCardMode) renderExpCard(filtered); else renderExpList(filtered);
    updateExpProgress(); updateExpMasteredUI();
    var label = document.getElementById('expModeLabel');
    if (label) label.textContent = '当前：' + (expShowMode === 'sentence' ? '原句' : '简化句');
    var modeBtn = document.getElementById('expToggleMode');
    if (modeBtn) modeBtn.textContent = expShowMode === 'sentence' ? '简化句' : '原句';
    var nav = document.getElementById('expCardNav');
    var btn = document.getElementById('expCardBtn');
    if (expCardMode) { nav.style.display = 'flex'; btn.textContent = '📋 列表'; }
    else { nav.style.display = 'none'; btn.textContent = '📇 记忆卡'; }
    saveSessionState();
    restoreExpState();
}

function renderExpList(filtered) {
    var container = document.getElementById('expContainer');
    filtered.forEach(function(q, idx) {
        var card = document.createElement('div');
        card.className = 'card'; card.id = 'exp-card-' + q.unit + '-' + idx;
        var badged = unitBadge(q.unit);
        var srcText = expShowMode === 'sentence' ? q.sentence : q.clue;
        var words = srcText.split(/_{3,}/);
        var displayHtml = words.join('<span class="blank" id="exp-blank-' + q.unit + '-' + idx + '">______</span>');
        q._options = generateExpOptions(q);
        card.innerHTML = '<div class="mc-question">' + badged + ' ' + displayHtml + '</div>' +
            '<div class="hint-box" id="exp-hint-' + q.unit + '-' + idx + '" style="display:' + (expShowHint ? 'block' : 'none') + '"><span class="hint-label">💡 联想口诀：</span>' + q.hint + '</div>' +
            '<div class="mc-options" id="exp-options-' + q.unit + '-' + idx + '">' +
            q._options.map(function(opt, oi) {
                return '<button class="mc-opt" data-ei="' + q.unit + '-' + idx + '" data-val="' + opt.replace(/'/g, "\\'") + '" onclick="selectExp(\'' + q.unit + '-' + idx + '\',\'' + opt.replace(/'/g, "\\'") + '\')">' + opt + '</button>';
            }).join('') + '</div>' +
            '<div class="mc-result" id="exp-result-' + q.unit + '-' + idx + '"></div>';
        container.appendChild(card);
    });
}

function renderExpCard(filtered) {
    var container = document.getElementById('expContainer');
    if (!filtered.length) { container.innerHTML = '<div class="card"><div class="mc-question">无匹配题目</div></div>'; return; }
    if (expCardIdx >= filtered.length) expCardIdx = 0;
    if (expCardIdx < 0) expCardIdx = filtered.length - 1;
    var q = filtered[expCardIdx];
    var key = q.unit + '-' + expCardIdx;
    var isMastered = expMastery[key] || false;
    var badged = unitBadge(q.unit);
    var srcText = expShowMode === 'sentence' ? q.sentence : q.clue;
    var words = srcText.split(/_{3,}/);
    var blankId = 'exp-card-blank-' + key;
    var displayHtml = words.join('<span class="blank-reveal" id="' + blankId + '" onclick="expClickBlank(\'' + key + '\',\'' + (q.filled || q.ans).replace(/'/g, "\\'") + '\')">______</span>');
    q._options = generateExpOptions(q);
    container.innerHTML = '<div class="card" id="exp-card-' + key + '">' +
        '<div class="mc-question">' + badged + ' ' + displayHtml + '</div>' +
        '<div class="hint-box" id="exp-hint-' + key + '" style="display:' + (expShowHint ? 'block' : 'none') + '"><span class="hint-label">💡 联想口诀：</span>' + q.hint + '</div>' +
        '<div class="mc-options mc-options-vertical" id="exp-options-' + key + '">' +
        q._options.map(function(opt, oi) {
            return '<button class="mc-opt" data-ei="' + key + '" data-val="' + opt.replace(/'/g, "\\'") + '" onclick="selectExp(\'' + key + '\',\'' + opt.replace(/'/g, "\\'") + '\')">' + opt + '</button>';
        }).join('') + '</div>' +
        '<div class="mc-result" id="exp-result-' + key + '"></div>' +
        '<div style="margin-top:10px;padding-top:10px;border-top:1px solid #e2e8f0;display:flex;gap:10px;justify-content:center;">' +
        (isMastered ? '<span style="color:#16a34a;font-weight:600;">✅ 已记住</span>' : '<span style="color:#f59e0b;font-weight:600;">🔄 待复习</span>') + '</div></div>';
    document.getElementById('expCardCounter').textContent = (expCardIdx + 1) + ' / ' + filtered.length;
    var mastered = filtered.filter(function(_, i) { return expMastery[q.unit + '-' + i]; }).length;
    document.getElementById('expCardProgress').textContent = new Array(mastered + 1).join('▓') + new Array(filtered.length - mastered + 1).join('░') + ' ' + mastered + '/' + filtered.length + '已记住';
}

function expClickBlank(key, ans) {
    var el = document.getElementById('exp-card-blank-' + key);
    if (!el || el.classList.contains('revealed')) return;
    el.textContent = ans; el.classList.add('revealed');
}

function expRevealBlank() {
    var f = document.querySelector('#sec-exp .unit-tabs .active');
    var filtered = (f.dataset.unit === 'all' ? expData : expData.filter(function(q) { return q.unit === parseInt(f.dataset.unit); }));
    if (!filtered.length) return;
    expClickBlank(filtered[expCardIdx].unit + '-' + expCardIdx, filtered[expCardIdx].filled || filtered[expCardIdx].ans);
}

function expPrev() {
    var f = document.querySelector('#sec-exp .unit-tabs .active');
    var filtered = (f.dataset.unit === 'all' ? expData : expData.filter(function(q) { return q.unit === parseInt(f.dataset.unit); }));
    if (!filtered.length) return; expCardIdx = (expCardIdx - 1 + filtered.length) % filtered.length; renderExpCard(filtered); saveSessionState();
}

function expNext() {
    var f = document.querySelector('#sec-exp .unit-tabs .active');
    var filtered = (f.dataset.unit === 'all' ? expData : expData.filter(function(q) { return q.unit === parseInt(f.dataset.unit); }));
    if (!filtered.length) return; expCardIdx = (expCardIdx + 1) % filtered.length; renderExpCard(filtered); saveSessionState();
}

function expMarkMastered(val) {
    var f = document.querySelector('#sec-exp .unit-tabs .active');
    var filtered = (f.dataset.unit === 'all' ? expData : expData.filter(function(q) { return q.unit === parseInt(f.dataset.unit); }));
    if (!filtered.length) return;
    expMastery[filtered[expCardIdx].unit + '-' + expCardIdx] = val;
    saveStored('expMastery', expMastery); updateExpMasteredUI(); renderExpCard(filtered);
}

function toggleExpCardMode() { expCardMode = !expCardMode; expCardIdx = 0; var f = document.querySelector('#sec-exp .unit-tabs .active'); renderExp(f ? f.dataset.unit : 'all'); }

function toggleExpHint() { expShowHint = !expShowHint; var btn = document.getElementById('expToggleHint'); btn.classList.toggle('active'); btn.classList.toggle('btn-outline'); var f = document.querySelector('#sec-exp .unit-tabs .active'); renderExp(f ? f.dataset.unit : 'all'); }

function toggleExpMode() { expShowMode = expShowMode === 'sentence' ? 'clue' : 'sentence'; var f = document.querySelector('#sec-exp .unit-tabs .active'); renderExp(f ? f.dataset.unit : 'all'); }

function expPhrasePrefix(phrase) {
    // 提取短语的前 1-2 个词，用于结构相似度比较
    var parts = phrase.toLowerCase().trim().split(/\s+/);
    if (!parts.length) return '';
    if (parts[0] === 'be' || parts[0] === 'get' || parts[0] === 'become') {
        return parts.slice(0, 2).join(' ');
    }
    return parts[0];
}

function expPhraseCore(phrase) {
    // 去掉 be/get/become 等助动词后的核心动词/名词
    var parts = phrase.toLowerCase().trim().split(/\s+/);
    if (parts[0] === 'be' || parts[0] === 'get' || parts[0] === 'become') {
        return parts.slice(2).join(' ');
    }
    return parts.slice(1).join(' ');
}

function isExpAnswerVariant(target, candidate) {
    // 检测 candidate 是否只是 target 中 be/get/become 动词形式的变体
    // 例如 be obliged to vs are obliged to / am obliged to / is obliged to
    var t = target.toLowerCase().trim();
    var c = candidate.toLowerCase().trim();
    if (t === c) return true;
    var beForms = ['be','am','is','are','was','were','been','being'];
    var getForms = ['get','gets','got','gotten','getting'];
    var becomeForms = ['become','becomes','became','becoming'];
    var allForms = beForms.concat(getForms).concat(becomeForms);
    var tParts = t.split(/\s+/);
    var cParts = c.split(/\s+/);
    if (tParts.length !== cParts.length) return false;
    for (var k = 0; k < tParts.length; k++) {
        if (tParts[k] === cParts[k]) continue;
        if (allForms.indexOf(tParts[k]) >= 0 && allForms.indexOf(cParts[k]) >= 0) continue;
        return false;
    }
    return true;
}

function expBeConjugations(phrase) {
    // 为 be 开头的短语生成常见变位形式，用作干扰项
    var parts = phrase.trim().split(/\s+/);
    if (parts[0].toLowerCase() !== 'be') return [];
    var rest = parts.slice(1).join(' ');
    return [
        'am ' + rest,
        'is ' + rest,
        'are ' + rest,
        'was ' + rest,
        'were ' + rest,
        'been ' + rest,
        'being ' + rest
    ];
}

function expGetConjugations(phrase) {
    // 为 get 开头的短语生成常见变位形式
    var parts = phrase.trim().split(/\s+/);
    if (parts[0].toLowerCase() !== 'get') return [];
    var rest = parts.slice(1).join(' ');
    return [
        'gets ' + rest,
        'got ' + rest,
        'gotten ' + rest,
        'getting ' + rest
    ];
}

function expBecomeConjugations(phrase) {
    // 为 become 开头的短语生成常见变位形式
    var parts = phrase.trim().split(/\s+/);
    if (parts[0].toLowerCase() !== 'become') return [];
    var rest = parts.slice(1).join(' ');
    return [
        'becomes ' + rest,
        'became ' + rest,
        'becoming ' + rest
    ];
}

function expAllConjugations(phrase) {
    return expBeConjugations(phrase)
        .concat(expGetConjugations(phrase))
        .concat(expBecomeConjugations(phrase));
}

function expSharedWordScore(a, b) {
    // 计算两个短语共享的实词数量（排除常见介词/助动词）
    var stop = { 'the':1, 'a':1, 'an':1, 'to':1, 'of':1, 'in':1, 'on':1, 'at':1, 'for':1, 'with':1, 'from':1, 'by':1, 'as':1, 'and':1, 'or':1, 'be':1, 'get':1, 'become':1 };
    var aw = a.toLowerCase().split(/\s+/).filter(function(w){ return !stop[w] && w; });
    var bw = b.toLowerCase().split(/\s+/).filter(function(w){ return !stop[w] && w; });
    var shared = 0;
    aw.forEach(function(w){ if (bw.indexOf(w) >= 0) shared++; });
    return shared;
}

function generateExpOptions(q) {
    var filledAns = q.filled || q.ans;
    var target = q.ans.toLowerCase();
    var targetLen = target.length;
    var targetPrefix = expPhrasePrefix(target);
    var targetCore = expPhraseCore(target);

    // 收集候选：同单元题目 -> 跨单元题目 -> 专用短语干扰项池
    var rawCandidates = expData.filter(function(x) { return x.unit === q.unit && x.ans !== q.ans; })
        .concat(expData.filter(function(x) { return x.unit !== q.unit && x.ans !== q.ans; }))
        .concat(expDistractors);

    // 展开为原型 + filled 变形 + 生成的变位形式
    var candidates = [];
    rawCandidates.forEach(function(i) {
        var base = i.ans;
        // 原型
        candidates.push({ ans: base, source: i });
        // 题目自带的变形（如 are obliged to）
        if (i.filled && i.filled !== base) {
            candidates.push({ ans: i.filled, source: i, isInflection: true });
        }
        // 对干扰项池中的 be/get/become 短语生成变位形式
        if (!i.unit) {
            expAllConjugations(base).forEach(function(form) {
                candidates.push({ ans: form, source: i, isInflection: true });
            });
        }
    });

    var map = {};
    candidates.forEach(function(item) {
        var key = item.ans;
        var cand = key.toLowerCase();
        if (map[key]) return;

        // 排除与正确答案完全相同或只是 be/get/become 变位的选项
        if (isExpAnswerVariant(target, cand)) return;

        var candLen = cand.length;
        var candPrefix = expPhrasePrefix(cand);
        var candCore = expPhraseCore(cand);

        var score = 0;
        // 编辑距离拼写相似度：最高 40 分
        var sim = 0;
        if (typeof levenshtein === 'function') {
            var maxLen = Math.max(targetLen, candLen);
            sim = maxLen ? 1 - levenshtein(target, cand) / maxLen : 0;
        }
        score += Math.round(sim * 40);

        // 共享实词：每共享一个 +8
        score += expSharedWordScore(target, cand) * 8;

        // 开头结构相同（如都是 be ... to / get ... with）：+15
        if (targetPrefix && candPrefix === targetPrefix) score += 15;

        // 核心部分相同（如都是 obliged to / committed to）：+10
        if (targetCore && candCore === targetCore) score += 10;

        // 长度接近：±2 +5，±5 +2
        var lenDiff = Math.abs(candLen - targetLen);
        score += lenDiff <= 2 ? 5 : lenDiff <= 5 ? 2 : 0;

        // 同单元题目略优先；变形形式额外加分，干扰性更强
        var src = item.source;
        if (src.unit === q.unit) score += 4;
        if (item.isInflection) score += 3;

        map[key] = { ans: key, score: score };
    });

    // 按干扰性排序，取前 16 个再随机抽 3 个
    var scored = Object.values(map).sort(function(a, b) { return b.score - a.score; }).slice(0, 16);
    var chosen = shuffle(scored).slice(0, 3).map(function(d) { return d.ans; });
    return shuffle([filledAns].concat(chosen));
}

function selectExp(ei, val) {
    var parts = ei.split('-');
    var unit = parts[0], idx = parseInt(parts[1]);
    var f = document.querySelector('#sec-exp .unit-tabs .active');
    var dataSource = (f.dataset.unit === 'all' ? expData : expData.filter(function(q) { return q.unit === parseInt(f.dataset.unit); }));
    var qData = dataSource[idx]; if (!qData) return;
    var optionsDiv = document.getElementById('exp-options-' + ei); if (!optionsDiv) return;
    var correctAns = qData.filled || qData.ans;
    optionsDiv.querySelectorAll('button').forEach(function(b) {
        if (b.dataset.val === correctAns) b.classList.add('correct');
        if (b.dataset.val === val && val !== correctAns) b.classList.add('wrong');
        if (b.dataset.val === val) b.classList.add('selected');
        b.classList.add('disabled'); b.onclick = null;
    });
    var resultDiv = document.getElementById('exp-result-' + ei);
    if (val === correctAns) { resultDiv.innerHTML = '<span class="correct-msg">&#10004; 正确！</span>'; expState[ei] = true; }
    else { resultDiv.innerHTML = '<span class="wrong-msg">&#10008; 正确答案：' + correctAns + '</span>'; expState[ei] = false; }
    saveStored('expState', expState);
    updateExpProgress();
}

function updateExpProgress() {
    var answered = Object.keys(expState).length;
    var correct = Object.values(expState).filter(function(v) { return v; }).length;
    document.getElementById('expAnswered').textContent = answered;
    document.getElementById('expCorrect').textContent = correct;
    document.getElementById('expRate').textContent = answered ? Math.round(correct / answered * 100) + '%' : '0%';
}

function resetExp() { expState = {}; saveStored('expState', expState); var f = document.querySelector('#sec-exp .unit-tabs .active'); renderExp(f ? f.dataset.unit : 'all'); }

// ---------- 恢复已答视觉状态 ----------
function restoreExpState() {
    Object.keys(expState).forEach(function(ei) {
        var opts = document.getElementById('exp-options-' + ei);
        var res = document.getElementById('exp-result-' + ei);
        if (!opts || !res) return;
        var isCorrect = expState[ei];
        var f = document.querySelector('#sec-exp .unit-tabs .active');
        var dataSource = (f.dataset.unit === 'all' ? expData : expData.filter(function(q) { return q.unit === parseInt(f.dataset.unit); }));
        var parts = ei.split('-');
        var qData = dataSource[parseInt(parts[1])];
        if (!qData) return;
        var correctAns = qData.filled || qData.ans;
        opts.querySelectorAll('button').forEach(function(b) {
            b.classList.add('disabled'); b.onclick = null;
            if (b.dataset.val === correctAns) b.classList.add('correct');
        });
        res.innerHTML = '<span class="' + (isCorrect ? 'correct-msg' : 'wrong-msg') + '">' + (isCorrect ? '\u2714 正确\uff01' : '\u2718 正确答案\uff1a' + correctAns) + '</span>';
    });
}
