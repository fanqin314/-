// ========================================================================
// 中译英 – 记忆优化版
// ========================================================================
var transReview = loadStored('transReview', {});
var transMode = 0;
var transWordIndex = {}; // 逐词练习当前输入位置
var transW2WData = loadStored('transW2WData', {}); // 逐词练习输入值持久化

function renderBlankedHtml(eng, keys) {
    var result = eng;
    var blanks = [];
    keys.split(', ').forEach(function(phrase) {
        var escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        var regex = new RegExp(escaped, 'gi');
        var words = phrase.split(' ');
        result = result.replace(regex, function() { var idx = blanks.length; blanks.push(words); return '__BLANK_' + idx + '__'; });
    });
    var parts = result.split(/(__BLANK_\d+__)/g);
    var html = '';
    parts.forEach(function(part) {
        var m = part.match(/__BLANK_(\d+)__/);
        if (m) {
            blanks[parseInt(m[1])].forEach(function(w, wi) {
                html += '<input class="blank-fill" data-answer="' + w.replace(/"/g, '&quot;') + '" style="width:' + Math.max(w.length * 9 + 18, 55) + 'px" placeholder="···">';
                if (wi < blanks[parseInt(m[1])].length - 1) html += ' ';
            });
        } else {
            html += part.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }
    });
    return html;
}

function checkBlanks(cardId) {
    var card = document.getElementById(cardId); if (!card) return;
    var inputs = card.querySelectorAll('.blank-fill');
    var correct = 0, total = inputs.length;
    inputs.forEach(function(inp) {
        if (inp.value.trim().toLowerCase() === inp.dataset.answer.toLowerCase()) { inp.classList.remove('blank-wrong'); inp.classList.add('blank-correct'); correct++; }
        else { inp.classList.remove('blank-correct'); inp.classList.add('blank-wrong'); }
    });
    var msg = card.querySelector('.blank-result');
    if (msg) msg.textContent = '✓ ' + correct + '/' + total + ' 正确';
}

function updateTransReviewCount() {
    document.getElementById('transReviewCount').textContent = Object.values(transReview).filter(function(v) { return v === -1; }).length;
}

function renderTrans() {
    var container = document.getElementById('transContainer');
    container.innerHTML = '';
    var sorted = transData.slice().sort(function(a, b) {
        var sa = transReview[a.id] || 0, sb = transReview[b.id] || 0;
        if (sa === -1 && sb !== -1) return -1;
        if (sa !== -1 && sb === -1) return 1;
        if (sa === 0 && sb === 1) return -1;
        if (sa === 1 && sb === 0) return 1;
        return a.id - b.id;
    });
    sorted.forEach(function(item, displayIdx) {
        var card = document.createElement('div');
        var status = transReview[item.id] || 0;
        var extraHtml = '', placeholder;
        if (transMode === 3) {
            // 逐词练习模式
            container.insertAdjacentHTML('beforeend', renderWordByWord(item, displayIdx));
            restoreW2WVisual(item.id);
            return;
        }
        card.className = 'card'; card.id = 'trans-card-' + item.id;
        if (transMode === 0) { placeholder = '在此处写出你的英文翻译...'; }
        else if (transMode === 1) { extraHtml = '<div style="margin-top:6px;"><span style="color:#2563eb;font-weight:500;">🔑 关键词</span> ' + item.keys + '</div>'; placeholder = '根据关键词写出英文翻译...'; }
        else { extraHtml = '<div style="margin-top:6px;"><span style="color:#6b21a8;font-weight:500;">✏️ 在句子中填入空缺的单词</span></div><div style="background:#faf5ff;padding:12px 14px;border-radius:10px;margin-top:6px;line-height:2.2;word-break:break-word;">' + renderBlankedHtml(item.eng, item.keys) + '</div>'; placeholder = '（已在上方填空框中填写，无需在此重复输入）'; }
        card.innerHTML = '<div class="trans-chinese">' + (displayIdx + 1) + '. ' + item.chn + extraHtml + '</div>' +
            '<div class="trans-area"' + (transMode === 2 ? ' style="display:none"' : '') + '><textarea rows="3" id="trans-input-' + item.id + '" placeholder="' + placeholder + '"></textarea></div>' +
            '<div class="trans-btn-group">' +
            '<button class="btn btn-answer btn-sm" id="trans-toggle-ans-' + item.id + '" onclick="toggleTransAnswer(' + item.id + ')">显示答案</button>' +
            '<button class="btn btn-outline btn-sm" onclick="document.getElementById(\'trans-input-' + item.id + '\').value=\'\'">清空</button>' +
            (transMode === 2 ? '<button class="btn btn-sm" style="background:#7c3aed;color:#fff;" onclick="checkBlanks(\'trans-card-' + item.id + '\')">检查填空</button>' : '') +
            '</div>' +
            '<div class="blank-result" id="blank-result-' + item.id + '" style="margin-top:6px;font-size:0.85rem;font-weight:600;color:#6b21a8;text-align:right;"></div>' +
            '<div class="trans-answer" id="trans-answer-' + item.id + '">' + item.eng + '</div>' +
            '<div class="trans-review" id="trans-review-' + item.id + '" style="margin-top:8px;display:flex;gap:8px;justify-content:flex-end;">' +
            '<button class="btn btn-sm ' + (status === -1 ? 'btn-warning' : 'btn-outline') + '" onclick="markTransReview(' + item.id + ', -1)">' + (status === -1 ? '🔁 待复习' : '还需复习') + '</button>' +
            '<button class="btn btn-sm ' + (status === 1 ? 'btn-success' : 'btn-outline') + '" onclick="markTransReview(' + item.id + ', 1)">' + (status === 1 ? '✓ 已记住' : '已记住') + '</button>' +
            '</div>';
        container.appendChild(card);
    });
    updateTransReviewCount();
    saveSessionState();
}

function showTrans(id) {
    var el = document.getElementById('trans-answer-' + id);
    if (el) el.classList.add('show');
    var rd = document.getElementById('trans-review-' + id);
    if (rd) rd.style.display = 'flex';
}

function hideTrans(id) {
    var el = document.getElementById('trans-answer-' + id);
    if (el) el.classList.remove('show');
}

function toggleTransAnswer(id) {
    var el = document.getElementById('trans-answer-' + id);
    var btn = document.getElementById('trans-toggle-ans-' + id);
    if (!el || !btn) return;
    if (el.classList.contains('show')) {
        el.classList.remove('show');
        btn.textContent = '显示答案';
        btn.className = 'btn btn-answer btn-sm';
    } else {
        el.classList.add('show');
        btn.textContent = '隐藏答案';
        btn.className = 'btn btn-outline btn-sm';
        var rd = document.getElementById('trans-review-' + id);
        if (rd) rd.style.display = 'flex';
    }
}

var transAllVisible = false;

function toggleAllTrans() {
    transAllVisible = !transAllVisible;
    var btn = document.getElementById('toggleAllAnsBtn');
    if (transAllVisible) {
        transData.forEach(function(item) {
            showTrans(item.id);
            var rd = document.getElementById('trans-review-' + item.id);
            if (rd) rd.style.display = 'flex';
            // 同步切换按钮文本
            var tb = document.getElementById('trans-toggle-ans-' + item.id);
            if (tb) { tb.textContent = '隐藏答案'; tb.className = 'btn btn-outline btn-sm'; }
            var wb = document.getElementById('w2w-toggle-ans-' + item.id);
            if (wb) { wb.textContent = '隐藏答案'; wb.className = 'btn btn-outline btn-sm'; }
        });
        btn.textContent = '隐藏答案';
    } else {
        transData.forEach(function(item) {
            hideTrans(item.id);
            var tb = document.getElementById('trans-toggle-ans-' + item.id);
            if (tb) { tb.textContent = '显示答案'; tb.className = 'btn btn-answer btn-sm'; }
            var wb = document.getElementById('w2w-toggle-ans-' + item.id);
            if (wb) { wb.textContent = '显示答案'; wb.className = 'btn btn-answer btn-sm'; }
        });
        btn.textContent = '展开答案';
    }
}

function clearAllTrans() {
    transData.forEach(function(item) {
        var el = document.getElementById('trans-input-' + item.id);
        if (el) el.value = '';
        // 逐词模式的重置
        resetW2W(item.id);
    });
}

function setTransMode(mode) {
    transMode = mode;
    var label = document.getElementById('transModeLabel');
    var labels = ['模式：完整中文', '模式：关键词提示', '模式：填空练习', '模式：逐词练习'];
    label.textContent = labels[mode];
    [0,1,2,3].forEach(function(m) {
        var btn = document.getElementById('transMode' + m);
        if (!btn) return;
        btn.classList.toggle('active', m === mode);
    });
    renderTrans();
}

function markTransReview(id, status) {
    transReview[id] = status;
    saveStored('transReview', transReview);
    updateTransReviewCount();
    var rd = document.getElementById('trans-review-' + id);
    if (rd) {
        rd.querySelectorAll('button').forEach(function(b) {
            var oc = b.getAttribute('onclick') || '';
            if (oc.indexOf('-1') !== -1) { b.className = 'btn btn-sm ' + (status === -1 ? 'btn-warning' : 'btn-outline'); b.textContent = status === -1 ? '🔁 待复习' : '还需复习'; }
            if (oc.indexOf(', 1)') !== -1) { b.className = 'btn btn-sm ' + (status === 1 ? 'btn-success' : 'btn-outline'); b.textContent = status === 1 ? '✓ 已记住' : '已记住'; }
        });
    }
}

function resetTransReview() {
    if (confirm('确定要重置所有复习记录吗？')) {
        transReview = {};
        saveStored('transReview', transReview);
        transW2WData = {};
        saveW2WData();
        renderTrans();
    }
}

// ========================================================================
// 逐词练习模式（类似 Qwerty Learner 的实时逐词检查）
// ========================================================================
function renderWordByWord(item, displayIdx) {
    var words = item.eng.split(/\s+/);
    var status = transReview[item.id] || 0;
    var cid = 'trans-card-' + item.id;

    var html = '<div class="card" id="' + cid + '">';
    // 中文句子
    html += '<div class="trans-chinese">' + (displayIdx + 1) + '. ' + item.chn + '</div>';

    // 恢复已保存的输入值和位置
    var saved = transW2WData[item.id] || {};
    var savedVals = saved.values || {};
    transWordIndex[item.id] = saved.currentIndex || 0;

    // 逐词输入区域
    html += '<div class="w2w-container" id="w2w-container-' + item.id + '" data-answer="' + item.eng.replace(/"/g, '&quot;') + '">';
    html += '<div class="w2w-words" id="w2w-words-' + item.id + '">';
    words.forEach(function(word, wi) {
        var w = word.replace(/"/g, '&quot;');
        var len = Math.max(word.length * 11 + 16, 42);
        var sv = (savedVals[wi] || '').replace(/"/g, '&quot;');
        html += '<span class="w2w-slot" id="w2w-slot-' + item.id + '-' + wi + '">';
        html += '<input class="w2w-input" value="' + sv + '" id="w2w-input-' + item.id + '-' + wi + '" data-answer="' + w + '" data-wi="' + wi + '" data-tid="' + item.id + '" style="width:' + len + 'px" placeholder="' + word + '" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">';
        html += '<span class="w2w-hint" id="w2w-hint-' + item.id + '-' + wi + '">' + word + '</span>';
        html += '</span>';
    });
    html += '</div>';

    // 进度条
    html += '<div class="w2w-progress" id="w2w-progress-' + item.id + '">';
    html += '<div class="w2w-progress-bar" id="w2w-progress-bar-' + item.id + '" style="width:0%"></div>';
    html += '</div>';
    // 剩余单词数
    html += '<div class="w2w-remain" id="w2w-remain-' + item.id + '">剩余 <span id="w2w-remain-count-' + item.id + '">' + words.length + '</span> / ' + words.length + ' 个单词</div>';
    html += '<div class="w2w-status" id="w2w-status-' + item.id + '">按空格/Tab跳到下一词，输入匹配自动前进</div>';
    html += '</div>';

    // 按钮组
    html += '<div class="trans-btn-group">';
    html += '<button class="btn btn-answer btn-sm" id="w2w-toggle-ans-' + item.id + '" onclick="toggleW2WAnswer(' + item.id + ')">显示答案</button>';
    html += '<button class="btn btn-outline btn-sm" onclick="resetW2W(' + item.id + ')">重来</button>';
    html += '</div>';

    // 答案区
    html += '<div class="trans-answer" id="trans-answer-' + item.id + '">' + item.eng + '</div>';

    // 复习标记
    html += '<div class="trans-review" id="trans-review-' + item.id + '" style="margin-top:8px;display:flex;gap:8px;justify-content:flex-end;">';
    html += '<button class="btn btn-sm ' + (status === -1 ? 'btn-warning' : 'btn-outline') + '" onclick="markTransReview(' + item.id + ', -1)">' + (status === -1 ? '🔁 待复习' : '还需复习') + '</button>';
    html += '<button class="btn btn-sm ' + (status === 1 ? 'btn-success' : 'btn-outline') + '" onclick="markTransReview(' + item.id + ', 1)">' + (status === 1 ? '✓ 已记住' : '已记住') + '</button>';
    html += '</div>';
    html += '</div>';

    return html;
}

function w2wGetCurrentInput(tid) {
    var idx = transWordIndex[tid] || 0;
    return document.getElementById('w2w-input-' + tid + '-' + idx);
}

function w2wMoveToNext(tid) {
    var words = (document.getElementById('w2w-container-' + tid).dataset.answer || '').split(/\s+/);
    var idx = transWordIndex[tid] || 0;
    if (idx >= words.length - 1) {
        // 最后一个词完成
        var status = document.getElementById('w2w-status-' + tid);
        if (status) status.textContent = '🎉 全部完成！';
        var progress = document.getElementById('w2w-progress-bar-' + tid);
        if (progress) progress.style.width = '100%';
        updateW2WRemain(tid);
        return;
    }
    transWordIndex[tid] = idx + 1;
    saveW2WData();
    var next = document.getElementById('w2w-input-' + tid + '-' + (idx + 1));
    if (next) {
        next.focus();
        // 标记当前 slot 为活跃
        var slot = document.getElementById('w2w-slot-' + tid + '-' + (idx + 1));
        if (slot) slot.classList.add('w2w-active');
    }
    // 更新进度
    var progress = document.getElementById('w2w-progress-bar-' + tid);
    if (progress) {
        var pct = Math.round((idx + 1) / words.length * 100);
        progress.style.width = pct + '%';
    }
    updateW2WRemain(tid);
    w2wScrollToActive(tid);
}

function w2wMoveToPrev(tid) {
    var idx = transWordIndex[tid] || 0;
    if (idx <= 0) return;
    transWordIndex[tid] = idx - 1;
    saveW2WData();
    var prev = document.getElementById('w2w-input-' + tid + '-' + (idx - 1));
    if (prev) {
        prev.focus();
        prev.select();
        var slot = document.getElementById('w2w-slot-' + tid + '-' + (idx - 1));
        if (slot) {
            slot.classList.add('w2w-active');
            // 清除当前 slot 高亮
            var curSlot = document.getElementById('w2w-slot-' + tid + '-' + idx);
            if (curSlot) curSlot.classList.remove('w2w-active');
        }
    }
    updateW2WRemain(tid);
    w2wScrollToActive(tid);
}

function saveW2WData() {
    saveStored('transW2WData', transW2WData);
}

function restoreW2WVisual(tid) {
    var container = document.getElementById('w2w-container-' + tid);
    if (!container) return;
    var words = (container.dataset.answer || '').split(/\s+/);
    var saved = transW2WData[tid];
    var savedVals = saved && saved.values ? saved.values : {};

    // 标记已完成的词为正确，并更新进度
    var completed = 0;
    words.forEach(function(_, wi) {
        var inp = document.getElementById('w2w-input-' + tid + '-' + wi);
        var slot = document.getElementById('w2w-slot-' + tid + '-' + wi);
        if (!inp || !slot) return;
        if (inp.value === inp.dataset.answer) {
            slot.classList.add('w2w-correct');
            completed++;
        }
    });
    var idx = transWordIndex[tid] || 0;

    // 激活当前槽位
    var curSlot = document.getElementById('w2w-slot-' + tid + '-' + idx);
    if (curSlot) curSlot.classList.add('w2w-active');

    // 焦点到当前输入框（阻止自动滚动，避免页面跳到底部）
    var curInput = document.getElementById('w2w-input-' + tid + '-' + idx);
    if (curInput) curInput.focus({ preventScroll: true });

    // 更新进度条
    var progress = document.getElementById('w2w-progress-bar-' + tid);
    if (progress) progress.style.width = Math.round(completed / words.length * 100) + '%';

    // 全部完成提示
    if (idx >= words.length) {
        var status = document.getElementById('w2w-status-' + tid);
        if (status) status.textContent = '🎉 全部完成！';
    }
    updateW2WRemain(tid);
    w2wScrollToActive(tid);
}

// 更新剩余单词数显示
function updateW2WRemain(tid) {
    var container = document.getElementById('w2w-container-' + tid);
    if (!container) return;
    var words = (container.dataset.answer || '').split(/\s+/);
    var completed = 0;
    words.forEach(function(_, wi) {
        var inp = document.getElementById('w2w-input-' + tid + '-' + wi);
        if (inp && inp.value === inp.dataset.answer) completed++;
    });
    var remain = words.length - completed;
    var el = document.getElementById('w2w-remain-count-' + tid);
    if (el) el.textContent = remain;
}

// 水平滚动到当前激活的单词（移动端）
function w2wScrollToActive(tid) {
    var container = document.getElementById('w2w-words-' + tid);
    if (!container) return;
    var idx = transWordIndex[tid] || 0;
    var activeSlot = document.getElementById('w2w-slot-' + tid + '-' + idx);
    if (!activeSlot) return;
    // 只在小屏/溢出时滚动
    if (container.scrollWidth > container.clientWidth) {
        activeSlot.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
}

function resetW2W(tid) {
    var container = document.getElementById('w2w-container-' + tid);
    if (!container) return;
    transWordIndex[tid] = 0;
    // 清除持久化数据
    delete transW2WData[tid];
    saveW2WData();
    var words = (container.dataset.answer || '').split(/\s+/);
    words.forEach(function(_, wi) {
        var inp = document.getElementById('w2w-input-' + tid + '-' + wi);
        var slot = document.getElementById('w2w-slot-' + tid + '-' + wi);
        if (inp) { inp.value = ''; inp.className = 'w2w-input'; }
        if (slot) slot.classList.remove('w2w-active', 'w2w-correct', 'w2w-wrong');
    });
    // 激活第一个
    var firstSlot = document.getElementById('w2w-slot-' + tid + '-0');
    if (firstSlot) firstSlot.classList.add('w2w-active');
    var firstInput = document.getElementById('w2w-input-' + tid + '-0');
    if (firstInput) firstInput.focus();
    var progress = document.getElementById('w2w-progress-bar-' + tid);
    if (progress) progress.style.width = '0%';
    var status = document.getElementById('w2w-status-' + tid);
    if (status) status.textContent = '按空格/Tab跳到下一词，输入匹配自动前进';
    updateW2WRemain(tid);
}

function w2wCheckInput(tid, wi) {
    var inp = document.getElementById('w2w-input-' + tid + '-' + wi);
    var slot = document.getElementById('w2w-slot-' + tid + '-' + wi);
    if (!inp || !slot) return;
    var answer = inp.dataset.answer;
    var val = inp.value;
    if (!val) {
        slot.classList.remove('w2w-correct', 'w2w-wrong');
        return;
    }
    // 逐字符检查前缀匹配 — 只对比已输入的字符
    var allPrefixCorrect = true;
    for (var i = 0; i < val.length; i++) {
        if (i < answer.length && val[i].toLowerCase() === answer[i].toLowerCase()) {
            continue;
        } else {
            allPrefixCorrect = false;
            break;
        }
    }
    if (val === answer) {
        slot.classList.add('w2w-correct');
        slot.classList.remove('w2w-wrong');
        // 自动前进
        setTimeout(function() { w2wMoveToNext(tid); }, 200);
    } else if (allPrefixCorrect && val.length < answer.length) {
        // 正在输入中，前缀正确
        slot.classList.remove('w2w-correct', 'w2w-wrong');
    } else {
        slot.classList.add('w2w-wrong');
        slot.classList.remove('w2w-correct');
    }
    // 更新进度
    var words = (document.getElementById('w2w-container-' + tid).dataset.answer || '').split(/\s+/);
    var completed = 0;
    for (var w = 0; w < words.length; w++) {
        if (w < wi) completed++;
        else if (w === wi && val === answer) completed++;
    }
    var progress = document.getElementById('w2w-progress-bar-' + tid);
    if (progress) progress.style.width = Math.round(completed / words.length * 100) + '%';
    updateW2WRemain(tid);
    w2wScrollToActive(tid);
}

function toggleW2WAnswer(id) {
    var el = document.getElementById('trans-answer-' + id);
    var btn = document.getElementById('w2w-toggle-ans-' + id);
    if (!el || !btn) return;
    if (el.classList.contains('show')) {
        el.classList.remove('show');
        btn.textContent = '显示答案';
        btn.className = 'btn btn-answer btn-sm';
    } else {
        el.classList.add('show');
        btn.textContent = '隐藏答案';
        btn.className = 'btn btn-outline btn-sm';
        var rd = document.getElementById('trans-review-' + id);
        if (rd) rd.style.display = 'flex';
    }
}

function initW2WEvents() {
    document.addEventListener('input', function(e) {
        var inp = e.target;
        if (!inp.classList.contains('w2w-input')) return;
        var tid = parseInt(inp.dataset.tid);
        var wi = parseInt(inp.dataset.wi);
        // 实时逐词检查
        w2wCheckInput(tid, wi);
        // 保存输入值
        if (!transW2WData[tid]) transW2WData[tid] = { values: {} };
        transW2WData[tid].values[wi] = inp.value;
        transW2WData[tid].currentIndex = transWordIndex[tid] || 0;
        saveW2WData();
    });

    // 点击/聚焦输入框时更新活跃状态
    document.addEventListener('focus', function(e) {
        var inp = e.target;
        if (!inp.classList.contains('w2w-input')) return;
        var tid = parseInt(inp.dataset.tid);
        var wi = parseInt(inp.dataset.wi);
        // 更新当前索引
        transWordIndex[tid] = wi;
        // 清除所有 slot 的活跃状态
        var container = document.getElementById('w2w-words-' + tid);
        if (container) {
            container.querySelectorAll('.w2w-slot').forEach(function(slot) {
                slot.classList.remove('w2w-active');
            });
        }
        // 标记当前为活跃
        var slot = document.getElementById('w2w-slot-' + tid + '-' + wi);
        if (slot) slot.classList.add('w2w-active');
        updateW2WRemain(tid);
        w2wScrollToActive(tid);
    }, true); // 使用 capture 因为 focus 不冒泡

    document.addEventListener('keydown', function(e) {
        var inp = e.target;
        if (!inp.classList.contains('w2w-input')) return;
        var tid = parseInt(inp.dataset.tid);
        var wi = parseInt(inp.dataset.wi);

        if (e.key === ' ' || e.key === 'Tab') {
            e.preventDefault();
            var val = inp.value.trim();
            var answer = inp.dataset.answer;
            if (val === answer) {
                w2wMoveToNext(tid);
            } else if (val) {
                // 即使不正确，空格/Tab 也跳到下一个
                w2wMoveToNext(tid);
            }
        } else if (e.key === 'Backspace' && inp.value === '' && wi > 0) {
            e.preventDefault();
            w2wMoveToPrev(tid);
        }
    });
}
