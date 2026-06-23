// ========================================================================
// 选词填空 (MC) — 记忆卡版
// ========================================================================
var mcState = loadStored('mcState', {});
var mcShowMode = 'sentence';
var mcShowHint = false;
var mcCardMode = false;
var mcCardIdx = 0;
var mcMastery = loadStored('mcMastery', {});
var mcWrongOnly = false;
var mcWrongSnapshot = [];

function updateMCMasteredUI() {
    document.getElementById('mcMastered').textContent = Object.values(mcMastery).filter(function(v) { return v; }).length;
}

function getMCFiltered(unitFilter) {
    if (unitFilter === undefined) {
        var f = document.querySelector('#sec-mc .unit-tabs .active');
        unitFilter = f ? f.dataset.unit : 'all';
    }
    var filtered = unitFilter === 'all' ? mcData : mcData.filter(function(q) { return q.unit === parseInt(unitFilter); });
    if (mcWrongOnly) {
        var snapshotSet = {};
        mcWrongSnapshot.forEach(function(k) { snapshotSet[k] = true; });
        return filtered.filter(function(q) { return snapshotSet[q.unit + '-' + q._globalIdx]; });
    }
    return filtered;
}

function renderMC(unitFilter) {
    var container = document.getElementById('mcContainer');
    container.innerHTML = '';
    var filtered = (typeof unitFilter === 'string' || unitFilter === undefined) ? getMCFiltered(unitFilter) : unitFilter;
    if (filtered.length === 0 && mcWrongOnly) {
        container.innerHTML = '<div class="card"><div class="mc-question" style="text-align:center;color:#16a34a;padding:1rem 0;">🎉 没有错题！全部答对了！</div></div>';
        updateMCProgress(); updateMCMasteredUI();
        var modeBtn = document.getElementById('mcToggleMode');
        if (modeBtn) modeBtn.textContent = mcShowMode === 'sentence' ? '简化句' : '原句';
        var nav = document.getElementById('mcCardNav');
        var btn = document.getElementById('mcCardBtn');
        nav.style.display = 'none'; btn.textContent = '📇 记忆卡';
        saveSessionState(); return;
    }
    if (mcCardMode) { if (mcCardIdx >= filtered.length) mcCardIdx = 0; renderMCCard(filtered); } else renderMCList(filtered);
    updateMCProgress(); updateMCMasteredUI();
    var label = document.getElementById('mcModeLabel');
    if (label) label.textContent = '当前：' + (mcShowMode === 'sentence' ? '原句' : '简化句');
    var modeBtn = document.getElementById('mcToggleMode');
    if (modeBtn) modeBtn.textContent = mcShowMode === 'sentence' ? '简化句' : '原句';
    var nav = document.getElementById('mcCardNav');
    var btn = document.getElementById('mcCardBtn');
    if (mcCardMode) { nav.style.display = 'flex'; btn.textContent = '📋 列表'; }
    else { nav.style.display = 'none'; btn.textContent = '📇 记忆卡'; }
    saveSessionState();
    restoreMCState();
}

function renderMCList(filtered) {
    var container = document.getElementById('mcContainer');
    filtered.forEach(function(q) {
        var key = q.unit + '-' + q._globalIdx;
        var card = document.createElement('div');
        card.className = 'card'; card.id = 'mc-card-' + key;
        var badged = unitBadge(q.unit);
        var srcText = mcShowMode === 'sentence' ? q.sentence : q.clue;
        var words = srcText.split(/_{3,}/);
        var displayHtml = words.join('<span class="blank" id="mc-blank-' + key + '">______</span>');
        q._options = generateMCOptions(q);
        card.innerHTML = '<div class="mc-question">' + badged + ' ' + displayHtml + '</div>' +
            '<div class="hint-box" id="mc-hint-' + key + '" style="display:' + (mcShowHint ? 'block' : 'none') + '"><span class="hint-label">💡 联想口诀：</span>' + q.hint + '</div>' +
            '<div class="mc-options" id="mc-options-' + key + '">' +
            q._options.map(function(opt, oi) {
                return '<button class="mc-opt" data-qi="' + key + '" data-val="' + opt.replace(/'/g, "\\'") + '" onclick="selectMC(\'' + key + '\',\'' + opt.replace(/'/g, "\\'") + '\')">' + opt + '</button>';
            }).join('') + '</div>' +
            '<div class="mc-result" id="mc-result-' + key + '"></div>';
        container.appendChild(card);
    });
}

function renderMCCard(filtered) {
    var container = document.getElementById('mcContainer');
    if (!filtered.length) { container.innerHTML = '<div class="card"><div class="mc-question">无匹配题目</div></div>'; return; }
    if (mcCardIdx >= filtered.length) mcCardIdx = 0;
    if (mcCardIdx < 0) mcCardIdx = filtered.length - 1;
    var q = filtered[mcCardIdx];
    var key = q.unit + '-' + q._globalIdx;
    var isMastered = mcMastery[key] || false;
    var badged = unitBadge(q.unit);
    var srcText = mcShowMode === 'sentence' ? q.sentence : q.clue;
    var words = srcText.split(/_{3,}/);
    var blankId = 'mc-card-blank-' + key;
    var displayHtml = words.join('<span class="blank-reveal" id="' + blankId + '" onclick="mcClickBlank(\'' + key + '\',\'' + (q.filled || q.ans).replace(/'/g, "\\'") + '\')">______</span>');
    q._options = generateMCOptions(q);
    container.innerHTML = '<div class="card" id="mc-card-' + key + '">' +
        '<div class="mc-question">' + badged + ' ' + displayHtml + '</div>' +
        '<div class="hint-box" id="mc-hint-' + key + '" style="display:' + (mcShowHint ? 'block' : 'none') + '"><span class="hint-label">💡 联想口诀：</span>' + q.hint + '</div>' +
        '<div class="mc-options mc-options-vertical" id="mc-options-' + key + '">' +
        q._options.map(function(opt, oi) {
            return '<button class="mc-opt" data-qi="' + key + '" data-val="' + opt.replace(/'/g, "\\'") + '" onclick="selectMC(\'' + key + '\',\'' + opt.replace(/'/g, "\\'") + '\')">' + opt + '</button>';
        }).join('') + '</div>' +
        '<div class="mc-result" id="mc-result-' + key + '"></div>' +
        '<div style="margin-top:10px;padding-top:10px;border-top:1px solid #e2e8f0;display:flex;gap:10px;justify-content:center;">' +
        (isMastered ? '<span style="color:#16a34a;font-weight:600;">✅ 已记住</span>' : '<span style="color:#f59e0b;font-weight:600;">🔄 待复习</span>') + '</div></div>';
    document.getElementById('mcCardCounter').textContent = (mcCardIdx + 1) + ' / ' + filtered.length;
    var mastered = filtered.filter(function(_, i) { return mcMastery[filtered[i].unit + '-' + filtered[i]._globalIdx]; }).length;
    document.getElementById('mcCardProgress').textContent = new Array(mastered + 1).join('▓') + new Array(filtered.length - mastered + 1).join('░') + ' ' + mastered + '/' + filtered.length + '已记住';
}

function mcClickBlank(key, ans) {
    var el = document.getElementById('mc-card-blank-' + key);
    if (!el || el.classList.contains('revealed')) return;
    el.textContent = ans; el.classList.add('revealed');
}

function mcRevealBlank() {
    var filtered = getMCFiltered();
    if (!filtered.length) return;
    var q = filtered[mcCardIdx];
    mcClickBlank(q.unit + '-' + q._globalIdx, q.filled || q.ans);
}

function mcPrev() {
    var filtered = getMCFiltered();
    if (!filtered.length) return; mcCardIdx = (mcCardIdx - 1 + filtered.length) % filtered.length; renderMCCard(filtered); saveSessionState();
}

function mcNext() {
    var filtered = getMCFiltered();
    if (!filtered.length) return; mcCardIdx = (mcCardIdx + 1) % filtered.length; renderMCCard(filtered); saveSessionState();
}

function mcMarkMastered(val) {
    var filtered = getMCFiltered();
    if (!filtered.length) return;
    var q = filtered[mcCardIdx];
    mcMastery[q.unit + '-' + q._globalIdx] = val;
    saveStored('mcMastery', mcMastery); updateMCMasteredUI(); renderMCCard(filtered);
}

function levenshtein(a, b) {
    var m = a.length, n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    var prev = new Array(n + 1), curr = new Array(n + 1);
    for (var j = 0; j <= n; j++) prev[j] = j;
    for (var i = 1; i <= m; i++) {
        curr[0] = i;
        for (var j = 1; j <= n; j++) {
            var cost = a[i - 1] === b[j - 1] ? 0 : 1;
            curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
        }
        var tmp = prev; prev = curr; curr = tmp;
    }
    return prev[n];
}

function wordSuffix(word) {
    var m = word.toLowerCase().match(/(ly|tion|sion|ment|ness|ity|ty|ence|ance|ure|age|ing|ed|er|or|ar|ent|ant|ive|ous|ful|less|able|ible|ic|al)$/);
    return m ? m[1] : '';
}

function wordPOSHint(word) {
    // 仅根据常见后缀推断词性，用于生成同类词尾干扰项
    var w = word.toLowerCase();
    if (/ly$/.test(w)) return 'adv';
    if (/tion$|sion$|ment$|ness$|ity$|ty$|ence$|ance$|ure$|age$/.test(w)) return 'n';
    if (/ing$|ed$|er$|or$|ar$/.test(w)) return 'v_or_adj';
    if (/ent$|ant$|ive$|ous$|ful$|less$|able$|ible$|ic$|al$/.test(w)) return 'adj';
    return '';
}

function spellingSimilarity(a, b) {
    // 返回 0~1，越接近拼写越相似
    var maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 0;
    return 1 - levenshtein(a, b) / maxLen;
}

function mcInflections(base) {
    // 为单词生成常见变形形式，作为干扰项出现
    var w = base.toLowerCase();
    var forms = [base];
    if (w.endsWith('y') && !/^[aeiou]y$/.test(w)) {
        forms.push(w.slice(0, -1) + 'ies');      // study -> studies
    }
    if (/[^e]e$/.test(w)) {
        forms.push(w + 'd');                      // decide -> decided
    }
    if (!w.endsWith('e')) {
        forms.push(w + 'ed');                     // exceed -> exceeded
    }
    forms.push(w + 'ing');                        // exceed -> exceeding
    forms.push(w + 's');                          // exceed -> exceeds
    forms.push(w + 'es');                         // distinguish -> distinguishes
    forms.push(w + 'ly');                         // precise -> precisely
    forms.push(w + 'ness');                       // precise -> preciseness
    forms.push(w + 'ment');                       // adjust -> adjustment
    forms.push(w + 'tion');                       // compete -> competition (简化)
    return forms;
}

function generateMCOptions(q) {
    var filledAns = q.filled || q.ans;
    var target = q.ans.toLowerCase();
    var targetLen = target.length;
    var targetFirst = target[0];
    var targetLast = target[targetLen - 1];
    var targetSuffix = wordSuffix(target);
    var targetPOS = wordPOSHint(target);

    // 收集候选：优先同单元题目，再跨单元题目，最后加入专用干扰项池
    var rawCandidates = mcData.filter(function(x) { return x.unit === q.unit && x.ans !== q.ans; })
        .concat(mcData.filter(function(x) { return x.unit !== q.unit && x.ans !== q.ans; }))
        .concat(mcDistractors);

    // 展开为原型 + 变形形式
    var candidates = [];
    rawCandidates.forEach(function(i) {
        var base = i.ans;
        // 加入原型
        candidates.push({ ans: base, source: i });
        // 加入 filled 变形（如果存在且不同）
        if (i.filled && i.filled !== base) {
            candidates.push({ ans: i.filled, source: i, isInflection: true });
        }
        // 生成额外变形（仅对干扰项池中的词，避免题目数据过度膨胀）
        if (!i.unit) {
            mcInflections(base).forEach(function(form) {
                if (form !== base && form !== i.filled) {
                    candidates.push({ ans: form, source: i, isInflection: true });
                }
            });
        }
    });

    var map = {};
    candidates.forEach(function(item) {
        var key = item.ans;
        var cand = key.toLowerCase();
        if (map[key]) return;

        // 排除正确答案本身（包括其原型）
        if (cand === target) return;

        var candLen = cand.length;
        var sim = spellingSimilarity(target, cand);
        var suffix = wordSuffix(cand);
        var pos = wordPOSHint(cand);

        var score = 0;
        // 拼写相似度（核心）：最高 50 分
        score += Math.round(sim * 50);

        // 同词尾 / 同词性词尾：+12
        if (targetSuffix && suffix === targetSuffix) score += 12;
        // 同类词性（后缀推断）：+8
        if (targetPOS && pos === targetPOS) score += 8;

        // 长度接近：±1 +6，±2 +3，±3 +1
        var lenDiff = Math.abs(candLen - targetLen);
        score += lenDiff <= 1 ? 6 : lenDiff <= 2 ? 3 : lenDiff <= 3 ? 1 : 0;

        // 首字母/尾字母相同
        if (cand[0] === targetFirst) score += 4;
        if (cand[candLen - 1] === targetLast) score += 3;

        // 同单元题目优先级略高
        var src = item.source;
        if (src.unit === q.unit) score += 5;
        // 变形形式额外加分，因为它们更容易干扰
        if (item.isInflection) score += 3;

        map[key] = { ans: key, score: score };
    });

    // 按干扰性排序，取前 16 个再随机抽 3 个
    var scored = Object.values(map).sort(function(a, b) { return b.score - a.score; }).slice(0, 16);
    var chosen = shuffle(scored).slice(0, 3).map(function(d) { return d.ans; });
    return shuffle([filledAns].concat(chosen));
}

function selectMC(qi, val) {
    var parts = qi.split('-');
    var unit = parts[0], idx = parseInt(parts[1]);
    var qData = mcData[idx];
    if (!qData || qData.unit !== parseInt(unit)) return;
    var optionsDiv = document.getElementById('mc-options-' + qi); if (!optionsDiv) return;
    var correctAns = qData.filled || qData.ans;
    optionsDiv.querySelectorAll('button').forEach(function(b) {
        if (b.dataset.val === correctAns) b.classList.add('correct');
        if (b.dataset.val === val && val !== correctAns) b.classList.add('wrong');
        if (b.dataset.val === val) b.classList.add('selected');
        b.classList.add('disabled'); b.onclick = null;
    });
    var resultDiv = document.getElementById('mc-result-' + qi);
    if (val === correctAns) {
        resultDiv.innerHTML = '<span class="correct-msg">&#10004; 正确！</span>';
        mcState[qi] = true;
        // 错题模式下答对，从快照移除；全部清空则自动退出错题模式
        if (mcWrongOnly) {
            var si = mcWrongSnapshot.indexOf(qi);
            if (si !== -1) mcWrongSnapshot.splice(si, 1);
            if (mcWrongSnapshot.length === 0) {
                mcWrongOnly = false;
                var wbtn = document.getElementById('mcToggleWrong');
                if (wbtn) { wbtn.classList.remove('active'); wbtn.classList.add('btn-outline'); wbtn.textContent = '❌ 错题重练'; }
                saveSessionState();
                renderMC();
                return;
            }
        }
    } else {
        resultDiv.innerHTML = '<span class="wrong-msg">&#10008; 正确答案：' + correctAns + '</span>';
        mcState[qi] = false;
    }
    saveStored('mcState', mcState);
    updateMCProgress();
}

function updateMCProgress() {
    var answered = Object.keys(mcState).length;
    var correct = Object.values(mcState).filter(function(v) { return v; }).length;
    var wrong = answered - correct;
    document.getElementById('mcAnswered').textContent = answered;
    document.getElementById('mcCorrect').textContent = correct;
    document.getElementById('mcRate').textContent = answered ? Math.round(correct / answered * 100) + '%' : '0%';
    var wrongEl = document.getElementById('mcWrongCount');
    if (wrongEl) wrongEl.textContent = wrong;
    var resetWrongBtn = document.getElementById('mcResetWrongBtn');
    if (resetWrongBtn) resetWrongBtn.style.display = wrong > 0 ? 'inline-block' : 'none';
}

function resetMC() { mcState = {}; mcWrongOnly = false; mcWrongSnapshot = []; saveStored('mcState', mcState); var f = document.querySelector('#sec-mc .unit-tabs .active'); renderMC(f ? f.dataset.unit : 'all'); }

function toggleMCWrongOnly() {
    mcCardIdx = 0;
    var btn = document.getElementById('mcToggleWrong');
    if (!btn) return;
    if (!mcWrongOnly) {
        // 进入错题模式：收集错题，清除答题记录，快照用于过滤显示
        mcWrongSnapshot = [];
        Object.keys(mcState).forEach(function(key) {
            if (mcState[key] === false) {
                mcWrongSnapshot.push(key);
                delete mcState[key];
            }
        });
        saveStored('mcState', mcState);
        if (mcWrongSnapshot.length === 0) {
            mcWrongOnly = false;
            return; // 无错题，不进入
        }
        mcWrongOnly = true;
        btn.classList.add('active');
        btn.classList.remove('btn-outline');
        btn.textContent = '✅ 错题重练中';
    } else {
        mcWrongOnly = false;
        mcWrongSnapshot = [];
        btn.classList.remove('active');
        btn.classList.add('btn-outline');
        btn.textContent = '❌ 错题重练';
    }
    renderMC();
    updateMCProgress();
    saveSessionState();
}

function resetMCWrong() {
    // 清除所有答错的记录
    Object.keys(mcState).forEach(function(key) {
        if (mcState[key] === false) delete mcState[key];
    });
    saveStored('mcState', mcState);
    mcWrongOnly = false;
    mcWrongSnapshot = [];
    var btn = document.getElementById('mcToggleWrong');
    if (btn) { btn.classList.remove('active'); btn.classList.add('btn-outline'); btn.textContent = '❌ 错题重练'; }
    renderMC();
    updateMCProgress();
    saveSessionState();
}

function toggleMCCardMode() { mcCardMode = !mcCardMode; mcCardIdx = 0; var f = document.querySelector('#sec-mc .unit-tabs .active'); renderMC(f ? f.dataset.unit : 'all'); }

function toggleMCHint() { mcShowHint = !mcShowHint; var btn = document.getElementById('mcToggleHint'); btn.classList.toggle('active'); btn.classList.toggle('btn-outline'); var f = document.querySelector('#sec-mc .unit-tabs .active'); renderMC(f ? f.dataset.unit : 'all'); }

function toggleMCMode() { mcShowMode = mcShowMode === 'sentence' ? 'clue' : 'sentence'; var f = document.querySelector('#sec-mc .unit-tabs .active'); renderMC(f ? f.dataset.unit : 'all'); }

// ---------- 恢复已答视觉状态 ----------
function restoreMCState() {
    Object.keys(mcState).forEach(function(qi) {
        var opts = document.getElementById('mc-options-' + qi);
        var res = document.getElementById('mc-result-' + qi);
        if (!opts || !res) return;
        var isCorrect = mcState[qi];
        var parts = qi.split('-');
        var qData = mcData[parseInt(parts[1])];
        if (!qData || qData.unit !== parseInt(parts[0])) return;
        var correctAns = qData.filled || qData.ans;
        opts.querySelectorAll('button').forEach(function(b) {
            b.classList.add('disabled'); b.onclick = null;
            if (b.dataset.val === correctAns) b.classList.add('correct');
        });
        res.innerHTML = '<span class="' + (isCorrect ? 'correct-msg' : 'wrong-msg') + '">' + (isCorrect ? '\u2714 正确\uff01' : '\u2718 正确答案\uff1a' + correctAns) + '</span>';
    });
}
