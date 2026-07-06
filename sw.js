請修復 fresh2.html 雲端還原的兩個問題。修改前先執行 cp fresh2.html fresh2.html.bak。檔案 1.3MB，全程只用 grep 定位 + view_range ±30 行，禁止讀整個檔案。

【問題 A：確認輔導紀錄下載是否已存在】
grep -n "cCounsel" fresh2.html
- 若找得到 → 跳過問題 A
- 若找不到 → 執行以下修復：
grep -n "fsGetAll(firebaseUid, _pfx+'day:')" 定位（約 4484 行，登入後雲端還原 useEffect，不是 3235 行 _arcPfx 那個），在 day: 還原迴圈結尾 } 之後插入：

                // ── 輔導紀錄：從 Firebase 還原 ──
                var cCounsel = 0;
                try {
                    var counselData = await window.fsGetAll(firebaseUid, _pfx+'counsel:');
                    for (var ck in counselData) {
                        if (ck.startsWith(_pfx+'counsel:')) {
                            var cds = ck.replace(_pfx+'counsel:', '');
                            await idbSet(_pfx+'counsel:' + cds, counselData[ck]);
                            try { _sl.set('hw5ren:c:' + _pfx + cds, counselData[ck]); } catch(ex) {}
                            cCounsel++;
                        }
                    }
                } catch(exC) {}

並把還原完成訊息 setStor({ state: 'ok', msg: '✅ 雲端還原 ' + c + ' 天資料' }); 改為
setStor({ state: 'ok', msg: '✅ 雲端還原 ' + c + ' 天資料、' + cCounsel + ' 天輔導' });
其條件 if (c > 0) 改為 if (c > 0 || cCounsel > 0)

【問題 B：新裝置上 activeClass 為空，導致組別（groupVersions）與幹部（officers）還原被跳過】
在同一個雲端還原 useEffect 內，grep -n "hw5ren:classes" 找到還原 classes 的這段：

                    if (savedSettings.classes && Array.isArray(savedSettings.classes)) {
                        setClasses(savedSettings.classes);
                        try { _sl.set('hw5ren:classes', JSON.stringify(savedSettings.classes)); } catch(ex) {}
                    }

用 str_replace 改為：

                    if (savedSettings.classes && Array.isArray(savedSettings.classes)) {
                        setClasses(savedSettings.classes);
                        try { _sl.set('hw5ren:classes', JSON.stringify(savedSettings.classes)); } catch(ex) {}
                        // 新裝置修復：activeClass 為空時，比對 year+className 自動選定班級，否則組別/幹部還原會被跳過
                        try {
                            if (!safeGet('hw5ren:activeClass') && savedSettings.classes.length > 0) {
                                var _pick = null;
                                for (var pi = 0; pi < savedSettings.classes.length; pi++) {
                                    var pc = savedSettings.classes[pi];
                                    if (pc.year === savedSettings.schoolYear && pc.className === savedSettings.className) { _pick = pc; break; }
                                }
                                if (!_pick) _pick = savedSettings.classes[0];
                                if (_pick && _pick.id) _sl.set('hw5ren:activeClass', _pick.id);
                            }
                        } catch(exA) {}
                    }

【重要規則】
- 班級物件的 id 欄位名稱請先 grep -n "activeClass" 看既有程式怎麼存取，若不是 .id 就照既有欄位名調整
- 不要動 doSync、scheduleAutoSync、loadCounsel、saveCounsel、migrateOldData
- 插入的程式碼在還原 officers 與 groupVersions 的程式碼「之前」（它們在同一個 async 區塊稍後執行，會讀取剛設好的 activeClass）

【修改後必做驗證】
1. wc -c fresh2.html 確認 > 0
2. grep -n "cCounsel" 至少 4 次、grep -n "exA" 至少 1 次
3. 靜態分析兩項必須都是 0：
python3 -c "
t=open('fresh2.html').read()
print('() diff:', t.count('(')-t.count(')'))
print('{} diff:', t.count('{')-t.count('}'))
"
4. 完成後以「✅ 靜態分析通過，直接上傳 GitHub 即可，不需要再跑一次」結尾。
