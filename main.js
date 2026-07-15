let SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxCYWMAbkmeiZXyvaCkwTYmlU0yyIaZgQSPwW7jcL8GjZdksIHltafvroHAgyLt-4pLKg/exec';

let studentsData = [];
let isAdmin = false;
let adminSessionPassword = '';
let adminRole = '';
let adminSheetUrl = '';
let fullAdminData = null;

// Elements
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const resultsContainer = document.getElementById('resultsContainer');
const statusMessage = document.getElementById('statusMessage');

// Admin Elements
const adminLoginBtn = document.getElementById('adminLoginBtn');
const adminModal = document.getElementById('adminModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const adminPassword = document.getElementById('adminPassword');
const adminError = document.getElementById('adminError');
const submitAdminBtn = document.getElementById('submitAdminBtn');
const openSheetBtn = document.getElementById('openSheetBtn');
const uploadBtn = document.getElementById('uploadBtn');
const fileUploadInput = document.getElementById('fileUploadInput');
// Config Elements
const adminConfigSection = document.getElementById('adminConfigSection');
const configEnableNotif = document.getElementById('configEnableNotif');
const configNotifText = document.getElementById('configNotifText');
const saveConfigBtn = document.getElementById('saveConfigBtn');
const newsTicker = document.getElementById('newsTicker');
const tickerText = document.getElementById('tickerText');

// Normalize string for searching (remove accents, to lowercase)
function removeAccents(str) {
    if (!str) return '';
    return str.toString().normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/đ/g, 'd').replace(/Đ/g, 'D')
              .toLowerCase().trim();
}

// Fetch and Parse CSV
function loadData() {
    statusMessage.textContent = 'Hệ thống đã sẵn sàng. Vui lòng nhập thông tin để tra cứu.';
    statusMessage.style.color = 'var(--text-muted)';
    statusMessage.style.display = 'block';
    searchInput.disabled = false;
    searchBtn.disabled = false;
}

function loadConfig() {
    fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'getConfig' })
    })
    .then(r => r.json())
    .then(res => {
        if (res.status === 'success') {
            let isEnabled = res.enableNotification === true || res.enableNotification === 'TRUE' || res.enableNotification === 'true';
            let text = res.notificationText || '';
            
            if (configEnableNotif) configEnableNotif.checked = isEnabled;
            if (configNotifText) configNotifText.value = text;

            if (isEnabled && text.trim() !== '') {
                tickerText.innerHTML = `<i class="fa-solid fa-bullhorn" style="color: #ffe600; margin-right: 10px; font-size: 1.2rem; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));"></i> ${text}`;
                newsTicker.style.display = 'block';
            } else {
                newsTicker.style.display = 'none';
            }
            
            const month = res.month || '.......';
            const year = res.year || '2026';
            const schoolYear = isNaN(parseInt(year)) ? '2026 – 2027' : `${year} – ${parseInt(year) + 1}`;
            
            document.querySelectorAll('.dynamic-month').forEach(el => el.textContent = month);
            document.querySelectorAll('.dynamic-year').forEach(el => el.textContent = year);
            document.querySelectorAll('.dynamic-school-year').forEach(el => el.textContent = schoolYear);
        }
    })
    .catch(err => console.error('Lỗi tải config:', err));
}

// Search Logic
function performSearch() {
    const query = searchInput.value.trim();
    
    if (query === '') {
        resultsContainer.innerHTML = '';
        return;
    }

    if (!isAdmin) {
        const justDigits = query.replace(/\s/g, '');
        if (/^\d+$/.test(justDigits)) {
            if (justDigits.length < 10) {
                resultsContainer.innerHTML = '<p style="text-align: center; color: #ef4444; margin-top: 20px; font-weight: 500;"><i class="fa-solid fa-circle-exclamation"></i> Vui lòng nhập ít nhất 10 số của Mã định danh để tra cứu.</p>';
                return;
            }
        } else {
            if (query.length < 4) {
                resultsContainer.innerHTML = '<p style="text-align: center; color: #ef4444; margin-top: 20px; font-weight: 500;"><i class="fa-solid fa-circle-exclamation"></i> Vui lòng nhập ít nhất 4 ký tự tên để tra cứu.</p>';
                return;
            }
        }
    }

    resultsContainer.innerHTML = '<div style="text-align:center; margin-top:20px;"><i class="fa-solid fa-circle-notch fa-spin fa-2x" style="color:var(--primary);"></i><p style="margin-top:10px;">Đang tìm kiếm trên máy chủ...</p></div>';

    fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'search', query: query })
    })
    .then(r => r.json())
    .then(res => {
        if (res.status === 'success') {
            renderResults(res.results, query);
        } else if (res.status === 'too_many') {
            if (!isAdmin) {
                resultsContainer.innerHTML = '<p style="text-align: center; color: #ef4444; margin-top: 20px; font-weight: 500;"><i class="fa-solid fa-shield-halved"></i> Có quá nhiều kết quả (' + res.count + '). Vui lòng nhập đầy đủ và chính xác Họ Tên hoặc Mã Định Danh để bảo vệ thông tin cá nhân của học sinh.</p>';
            } else {
                resultsContainer.innerHTML = '<p style="text-align: center; color: #ef4444; margin-top: 20px;">Kết quả tìm kiếm quá nhiều (' + res.count + '). Hãy cung cấp từ khóa chi tiết hơn.</p>';
            }
        } else {
            resultsContainer.innerHTML = '<p style="text-align: center; color: #ef4444; margin-top: 20px;">' + (res.message || 'Lỗi tìm kiếm') + '</p>';
        }
    })
    .catch(err => {
        resultsContainer.innerHTML = '<p style="text-align: center; color: #ef4444; margin-top: 20px;">Lỗi mạng khi tìm kiếm.</p>';
        console.error(err);
    });
}

// Render HTML
function renderResults(results, query) {
    resultsContainer.innerHTML = '';

    if (results.length === 0) {
        if (query) {
            resultsContainer.innerHTML = `
                <div class="empty-state">
                    <h3>Không tìm thấy kết quả</h3>
                    <p>Không có học sinh nào khớp với thông tin "${query}".</p>
                </div>
            `;
        }
        return;
    }

    results.forEach((student, index) => {
        const stt = student[0] || '';
        const name = student[3] || 'Không có thông tin';
        const id = student[1] || 'Không có thông tin'; // Số định danh cá nhân ở cột B (index 1)
        const dob = student[5] || 'Không có thông tin';
        const school = student[10] || 'Không có thông tin';
        const phuongXa = student[15] || '';
        const khuPho = student[16] || '';
        const soNha = student[19] || '';
        const time = student[48] || 'Không có thông tin';

        // Combine address
        const addressParts = [soNha, khuPho, phuongXa].filter(part => part && part.trim() !== '');
        const address = addressParts.length > 0 ? addressParts.join(', ') : 'Không có thông tin';

        let displayId = id;
        let displayAddress = soNha ? soNha : 'Không có thông tin';
        let displayKhuPho = khuPho ? khuPho : 'Không có thông tin';
        let displayPhuongXa = phuongXa ? phuongXa : 'Không có thông tin';
        
        let needsUnlock = false;

        // Nếu không phải Admin và tìm kiếm không phải là số (không phải tìm theo Mã/STT)
        if (!isAdmin && !/^\d+$/.test(query.trim())) {
            needsUnlock = true;
            if (id.length >= 8) {
                // Ẩn 4 số giữa
                const midStart = Math.floor((id.length - 4) / 2);
                displayId = id.substring(0, midStart) + '****' + id.substring(midStart + 4);
            } else {
                displayId = '***';
            }
            displayAddress = '***'; // Chỉ che số nhà
        }

        let cardHTML = `
            <div class="result-card">
                <div class="card-header">
                    <div class="student-info">
                        <h2>${name.toUpperCase()}</h2>
                        <div class="student-id"><i class="fa-regular fa-id-card"></i> Số định danh: <span id="id_text_${stt}">${displayId}</span></div>
                        <div class="student-time" style="color: #ef4444; font-weight: bold; font-size: 0.95rem;">
                            <i class="fa-regular fa-clock"></i> Thời gian hẹn: ${time}
                        </div>
                    </div>
                    <div class="stt-badge">
                        <span class="stt-label">Số Thứ Tự</span>
                        <span class="stt-number">${stt}</span>
                    </div>
                </div>
                <div class="card-body">
                    <div class="detail-item"><i class="fa-regular fa-calendar"></i> <strong>Ngày sinh:</strong> ${dob}</div>
                    <div class="detail-item"><i class="fa-solid fa-school"></i> <strong>Trường:</strong> ${school}</div>
                    
                    <div id="obscured_addr_${stt}">
                        <div class="detail-item"><i class="fa-solid fa-location-dot"></i> <strong>Địa chỉ:</strong> ${displayAddress}</div>
                        <div class="detail-item" style="margin-left: 30px;"><i class="fa-solid fa-map"></i> <strong>Khu phố:</strong> ${displayKhuPho}</div>
                        <div class="detail-item" style="margin-left: 30px;"><i class="fa-solid fa-map-location-dot"></i> <strong>Phường/Xã:</strong> ${displayPhuongXa}</div>
                        ${needsUnlock ? `<button onclick="unlockInfo('${stt}')" style="margin-top: 10px; padding: 6px 12px; background-color: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem; font-weight: 500;"><i class="fa-solid fa-unlock"></i> Bấm vào đây để xem đủ thông tin</button>` : ''}
                    </div>

                    <div id="revealed_addr_${stt}" style="display: none;">
                        <div class="detail-item"><i class="fa-solid fa-location-dot"></i> <strong>Địa chỉ:</strong> ${soNha ? soNha : 'Không có thông tin'}</div>
                        <div class="detail-item" style="margin-left: 30px;"><i class="fa-solid fa-map"></i> <strong>Khu phố:</strong> ${khuPho ? khuPho : 'Không có thông tin'}</div>
                        <div class="detail-item" style="margin-left: 30px;"><i class="fa-solid fa-map-location-dot"></i> <strong>Phường/Xã:</strong> ${phuongXa ? phuongXa : 'Không có thông tin'}</div>
                    </div>
                </div>
        `;
        
        if (isAdmin) {
            const isEnrolled = (student[49] || '').trim().toLowerCase() === 'x';
            const hasEnglish = (student[50] || '').trim().toLowerCase() === 'x';
            const isTransfer = (student[51] || '').trim().toLowerCase() === 'x';
            const note = student[52] || '';
            cardHTML += `
                <div class="admin-actions">
                    <label><input type="checkbox" id="check_${stt}" ${isEnrolled ? 'checked' : ''}> Đã nộp hồ sơ nhập học</label>
                    <label><input type="checkbox" id="eng_${stt}" ${hasEnglish ? 'checked' : ''}> Có chứng chỉ Tiếng Anh</label>
                    <label><input type="checkbox" id="transfer_${stt}" ${isTransfer ? 'checked' : ''}> Chuyển trường</label>
                    <textarea id="note_${stt}" placeholder="Ghi chú...">${note}</textarea>
                    <div style="display: flex; gap: 10px; margin-top: 10px;">
                        <button onclick="printForm('${stt}')" class="btn-print" style="background-color: #64748b; color: white; padding: 10px 15px; border-radius: 4px; border: none; cursor: pointer; flex: 1; font-weight: 600;"><i class="fa-solid fa-print"></i> In phiếu đăng ký</button>
                        <button onclick="updateStudent('${stt}')" id="btn_${stt}" style="flex: 1;">Lưu dữ liệu</button>
                    </div>
                </div>
            `;
        }

        cardHTML += `</div>`;
        resultsContainer.insertAdjacentHTML('beforeend', cardHTML);
    });
}


// Event Listeners
searchBtn.addEventListener('click', performSearch);
// === Xử lý bôi đen + fix lỗi bộ gõ Tiếng Việt (Unikey/EVKey) ===
// Khi bật IME tiếng Việt, gõ đè lên vùng bôi đen sẽ bị nối tiếp thay vì thay thế.
// Giải pháp: Lưu giá trị cũ khi click, sau khi ký tự mới được chèn (input event),
// nếu phát hiện IME nối tiếp → cắt bỏ phần cũ, chỉ giữ ký tự mới.
let _selectedValue = '';
let _wasSelected = false;

searchInput.addEventListener('click', function() {
    var input = this;
    _selectedValue = input.value;
    _wasSelected = input.value.length > 0;
    // setTimeout để select() chạy SAU mouseup, tránh bị trình duyệt hủy bôi đen
    setTimeout(function() { input.select(); }, 0);
});
searchInput.addEventListener('focus', function() {
    var input = this;
    _selectedValue = input.value;
    _wasSelected = input.value.length > 0;
    setTimeout(function() { input.select(); }, 0);
});

// Khi người dùng gõ ký tự, kiểm tra xem IME có nối tiếp không
searchInput.addEventListener('input', function() {
    if (_wasSelected && _selectedValue && this.value.startsWith(_selectedValue) && this.value.length > _selectedValue.length) {
        // IME đã nối tiếp → cắt bỏ phần cũ, giữ lại phần mới gõ
        this.value = this.value.substring(_selectedValue.length);
    }
    _wasSelected = false;
    _selectedValue = '';
});

// Real-time search
let searchTimeout;
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        performSearch();
    }
});

// Admin Modal Logic
adminLoginBtn.addEventListener('click', () => {
    if (isAdmin) {
        isAdmin = false;
        document.body.classList.remove('admin-active');
        adminLoginBtn.innerHTML = '<i class="fa-solid fa-lock"></i> <span class="admin-text">Admin</span>';
        adminLoginBtn.style.background = '';
        adminLoginBtn.style.color = '';
        openSheetBtn.classList.add('hidden');
        if (uploadBtn) uploadBtn.classList.add('hidden');
        const statsBtn = document.getElementById('statsBtn');
        if (statsBtn) statsBtn.classList.add('hidden');
        const batchPrintBtn = document.getElementById('batchPrintBtn');
        if (batchPrintBtn) batchPrintBtn.classList.add('hidden');
        adminConfigSection.classList.add('hidden');
        performSearch();
    } else {
        adminModal.classList.remove('hidden');
    }
});

closeModalBtn.addEventListener('click', () => {
    adminModal.classList.add('hidden');
    adminError.classList.add('hidden');
});

function handleLogin() {
    const pwd = adminPassword.value;
    adminLoginBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';
    fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'login', password: pwd })
    })
    .then(r => r.json())
    .then(res => {
        if (res.status === 'success') {
            isAdmin = true;
            adminSessionPassword = pwd;
            adminSheetUrl = res.sheetUrl;
            adminRole = res.role;
            document.body.classList.add('admin-active');
            adminModal.classList.add('hidden');
            adminLoginBtn.innerHTML = '<i class="fa-solid fa-lock-open"></i> <span class="admin-text">Thoát Admin</span>';
            adminLoginBtn.style.background = '#10b981';
            adminLoginBtn.style.color = 'white';
            openSheetBtn.classList.remove('hidden');
            if (uploadBtn) uploadBtn.classList.remove('hidden');
            const statsBtn = document.getElementById('statsBtn');
            if (statsBtn) statsBtn.classList.remove('hidden');
            const batchPrintBtn = document.getElementById('batchPrintBtn');
            if (batchPrintBtn) batchPrintBtn.classList.remove('hidden');
            adminConfigSection.classList.remove('hidden');
            if (searchInput.value.trim() !== '') performSearch();
            
            // Tải dữ liệu ngầm cho chức năng in/thống kê
            fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'getAllData', password: pwd })
            }).then(r => r.json()).then(res2 => {
                if (res2.status === 'success') fullAdminData = res2.results;
            });
        } else {
            adminError.classList.remove('hidden');
            adminError.textContent = res.message || 'Sai mật khẩu';
            adminLoginBtn.innerHTML = '<i class="fa-solid fa-lock"></i> <span class="admin-text">Admin</span>';
        }
    })
    .catch(err => {
        alert('Lỗi mạng khi đăng nhập');
        adminLoginBtn.innerHTML = '<i class="fa-solid fa-lock"></i> <span class="admin-text">Admin</span>';
    });
}

submitAdminBtn.addEventListener('click', handleLogin);
adminPassword.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleLogin(); });

if (saveConfigBtn) {
    saveConfigBtn.addEventListener('click', () => {
        const isEnabled = configEnableNotif.checked;
        const text = configNotifText.value;
        const originalText = saveConfigBtn.innerHTML;
        saveConfigBtn.innerHTML = 'Đang lưu...';
        saveConfigBtn.disabled = true;

        fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ 
                password: adminSessionPassword,
                action: 'updateConfig',
                enableNotification: isEnabled,
                notificationText: text
            })
        })
        .then(r => r.json())
        .then(res => {
            if (res.status === 'success') {
                // Lưu vào localStorage để tránh cache Google dội lại khi F5
                localStorage.setItem('admin_config_enable', isEnabled);
                localStorage.setItem('admin_config_text', text);
                localStorage.setItem('admin_config_time', Date.now());

                saveConfigBtn.innerHTML = '<i class="fa-solid fa-check"></i> Đã lưu';
                if (isEnabled && text.trim() !== '') {
                    tickerText.innerHTML = `<i class="fa-solid fa-bullhorn" style="color: #ffe600; margin-right: 10px; font-size: 1.2rem; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));"></i> ${text}`;
                    newsTicker.style.display = 'block';
                } else {
                    newsTicker.style.display = 'none';
                }
            } else {
                alert('Lỗi: ' + res.message);
                saveConfigBtn.innerHTML = originalText;
            }
            setTimeout(() => {
                saveConfigBtn.innerHTML = originalText;
                saveConfigBtn.disabled = false;
            }, 2000);
        })
        .catch(e => { 
            alert('Lỗi mạng!'); 
            saveConfigBtn.innerHTML = originalText;
            saveConfigBtn.disabled = false; 
        });
    });
}

window.unlockInfo = function(stt) {
    const student = studentsData.find(s => s[0] && s[0].toString() === stt.toString());
    if (!student) return;
    const realId = student[1] || '';
    const pass = prompt('Vui lòng nhập Mã định danh cá nhân của học sinh để xem chi tiết:');
    if (pass === realId) {
        document.getElementById(`obscured_addr_${stt}`).style.display = 'none';
        document.getElementById(`revealed_addr_${stt}`).style.display = 'block';
        document.getElementById(`id_text_${stt}`).innerText = realId;
    } else if (pass !== null) {
        alert('Mã định danh không chính xác!');
    }
}

window.updateStudent = function(stt) {
    if (!SCRIPT_URL) { alert("Thiết lập SCRIPT_URL!"); return; }
    
    let passToUse = adminSessionPassword;
    if (adminRole !== 'super') {
        const p = prompt('Vui lòng nhập mật khẩu cấp cao (khoa186) để Cập nhật:');
        if (!p) return;
        passToUse = p;
    }

    const isEnrolled = document.getElementById(`check_${stt}`).checked;
    const hasEnglish = document.getElementById(`eng_${stt}`).checked;
    const isTransfer = document.getElementById(`transfer_${stt}`).checked;
    const note = document.getElementById(`note_${stt}`).value;
    const btn = document.getElementById(`btn_${stt}`);
    btn.disabled = true;
    btn.innerText = 'Đang lưu...';

    fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ 
            password: passToUse, 
            action: 'updateStudent',
            stt: stt, 
            daNhapHoc: isEnrolled ? 'x' : '', 
            tiengAnh: hasEnglish ? 'x' : '', 
            chuyenTruong: isTransfer ? 'x' : '', 
            ghiChu: note 
        })
    })
    .then(r => r.json())
    .then(res => {
        if (res.status === 'success') {
            btn.innerHTML = '<i class="fa-solid fa-check"></i> Đã lưu';
            if (adminRole !== 'super') {
                adminRole = 'super';
                adminSessionPassword = passToUse;
            }
            
            // Cập nhật dữ liệu ngay lập tức vào bộ nhớ tạm (không cần F5)
            const studentIndex = studentsData.findIndex(s => s[0] && s[0].toString() === stt.toString());
            if (studentIndex !== -1) {
                while (studentsData[studentIndex].length < 54) studentsData[studentIndex].push('');
                studentsData[studentIndex][49] = isEnrolled ? 'x' : '';
                studentsData[studentIndex][50] = hasEnglish ? 'x' : '';
                studentsData[studentIndex][51] = isTransfer ? 'x' : '';
                studentsData[studentIndex][52] = note;
            }
            if (fullAdminData) {
                const fsIndex = fullAdminData.findIndex(s => s[0] && s[0].toString() === stt.toString());
                if (fsIndex !== -1) {
                    while (fullAdminData[fsIndex].length < 54) fullAdminData[fsIndex].push('');
                    fullAdminData[fsIndex][49] = isEnrolled ? 'x' : '';
                    fullAdminData[fsIndex][50] = hasEnglish ? 'x' : '';
                    fullAdminData[fsIndex][51] = isTransfer ? 'x' : '';
                    fullAdminData[fsIndex][52] = note;
                }
            }
            
            setTimeout(() => {
                btn.innerHTML = '<i class="fa-regular fa-floppy-disk"></i> Lưu';
                btn.disabled = false;
            }, 2000);
        } else {
            alert('Lỗi: ' + res.message);
            btn.innerHTML = '<i class="fa-regular fa-floppy-disk"></i> Lưu';
            btn.disabled = false;
        }
    })
    .catch(e => {
        alert('Lỗi kết nối');
        btn.innerHTML = '<i class="fa-regular fa-floppy-disk"></i> Lưu';
        btn.disabled = false;
    });
};

if (configEnableNotif && configNotifText) {
    configEnableNotif.addEventListener('change', (e) => {
        if (e.target.checked) {
            if (configNotifText.value.trim() !== '') {
                tickerText.innerHTML = `<i class="fa-solid fa-bullhorn" style="color: #ffe600; margin-right: 10px; font-size: 1.2rem; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));"></i> ${configNotifText.value}`;
                newsTicker.style.display = 'block';
            }
        } else {
            newsTicker.style.display = 'none';
        }
    });

    configNotifText.addEventListener('input', (e) => {
        if (configEnableNotif.checked) {
            if (e.target.value.trim() !== '') {
                tickerText.innerHTML = `<i class="fa-solid fa-bullhorn" style="color: #ffe600; margin-right: 10px; font-size: 1.2rem; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));"></i> ${e.target.value}`;
                newsTicker.style.display = 'block';
            } else {
                newsTicker.style.display = 'none';
            }
        }
    });
}

window.showStats = function() {
    if (!isAdmin) return;
    if (!fullAdminData) {
        alert("Dữ liệu đang được tải về từ máy chủ, vui lòng thử lại sau vài giây...");
        return;
    }
    
    let total = fullAdminData.length;
    let nhapHoc = 0;
    let tiengAnh = 0;
    let chuyenTruong = 0;

    fullAdminData.forEach(student => {
        if ((student[49] || '').trim().toLowerCase() === 'x') nhapHoc++;
        if ((student[50] || '').trim().toLowerCase() === 'x') tiengAnh++;
        if ((student[51] || '').trim().toLowerCase() === 'x') chuyenTruong++;
    });

    const chuaNhapHoc = total - nhapHoc;

    const statsHTML = `
        <div style="font-size: 1.1rem; line-height: 2;">
            <p style="padding: 10px; background: #f8fafc; border-radius: 8px; margin-bottom: 8px;">
                <i class="fa-solid fa-users" style="color: var(--primary); width: 30px;"></i> <strong>Tổng số học sinh:</strong> <span style="float: right; font-weight: bold; font-size: 1.2rem;">${total}</span>
            </p>
            <p style="padding: 10px; background: #ecfdf5; border-radius: 8px; margin-bottom: 8px;">
                <i class="fa-solid fa-check-circle" style="color: var(--success); width: 30px;"></i> <strong>Đã nộp hồ sơ:</strong> <span style="float: right; color: var(--success); font-weight: bold; font-size: 1.2rem;">${nhapHoc}</span>
            </p>
            <p style="padding: 10px; background: #fef2f2; border-radius: 8px; margin-bottom: 8px;">
                <i class="fa-solid fa-clock-rotate-left" style="color: var(--highlight); width: 30px;"></i> <strong>Chưa làm thủ tục:</strong> <span style="float: right; color: var(--highlight); font-weight: bold; font-size: 1.2rem;">${chuaNhapHoc}</span>
            </p>
            <p style="padding: 10px; background: #f5f3ff; border-radius: 8px; margin-bottom: 8px;">
                <i class="fa-solid fa-language" style="color: #8b5cf6; width: 30px;"></i> <strong>Đăng ký Tiếng Anh:</strong> <span style="float: right; color: #8b5cf6; font-weight: bold; font-size: 1.2rem;">${tiengAnh}</span>
            </p>
            <p style="padding: 10px; background: #fffbeb; border-radius: 8px; margin-bottom: 8px;">
                <i class="fa-solid fa-arrow-right-arrow-left" style="color: #f59e0b; width: 30px;"></i> <strong>Xin chuyển trường:</strong> <span style="float: right; color: #f59e0b; font-weight: bold; font-size: 1.2rem;">${chuyenTruong}</span>
            </p>
        </div>
    `;

    document.getElementById('statsContent').innerHTML = statsHTML;
    document.getElementById('statsModal').classList.remove('hidden');
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    searchInput.disabled = true;
    searchBtn.disabled = true;
    
    // Load data
    loadData();
    loadConfig();
});

// File Upload Logic
if (fileUploadInput) {
    fileUploadInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(evt) {
            const data = new Uint8Array(evt.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // FIX LỖI DO FILE XUẤT TỪ PHẦN MỀM KHÁC BỊ SAI KHUNG DỮ LIỆU (!ref)
            // Khung dữ liệu trong file bị báo sai (chỉ có 7 dòng), nên ta tự động tính toán lại chiều dài thật của file.
            if(worksheet['!ref']) {
                let max_r = 0, max_c = 0;
                Object.keys(worksheet).forEach(key => {
                    if (key[0] !== '!') {
                        const cell = XLSX.utils.decode_cell(key);
                        if (cell.r > max_r) max_r = cell.r;
                        if (cell.c > max_c) max_c = cell.c;
                    }
                });
                worksheet['!ref'] = XLSX.utils.encode_range({s: {c: 0, r: 0}, e: {c: max_c, r: max_r}});
            }
            
            // Convert to array of arrays, header: 1 means 2D array
            const jsonData = XLSX.utils.sheet_to_json(worksheet, {header: 1, defval: ''});
            
            // Không dùng slice(7) nữa vì SheetJS có thể bỏ qua dòng trống khiến index bị lệch.
            // Thay vào đó, ta sẽ quét toàn bộ file và dùng Regex để nhận diện dòng chứa học sinh.
            const importedStudents = jsonData;
            
            const newStudents = [];
            let duplicateCount = 0;
            
            // Extract existing IDs for fast lookup
            const existingIDs = new Set(studentsData.map(s => {
                const id = s[1]; // Số định danh cá nhân is at index 1
                return id ? removeAccents(id.toString()).replace(/^0+/, '') : '';
            }).filter(id => id !== ''));
            
            importedStudents.forEach(row => {
                if (!row || row.length < 3) return;
                
                const id = row[1]; // Đổi sang Cột B (Số định danh cá nhân) làm khóa chính
                if (!id) return;
                
                const idStr = id.toString().trim();
                
                // Nhận diện dòng dữ liệu hợp lệ: Số định danh cá nhân thường là chuỗi số dài (12 số)
                // Tránh lấy nhầm dòng Tiêu đề (header) hoặc dòng trống
                if (!/^\d{5,}$/.test(idStr.replace(/\s/g, ''))) {
                    return; 
                }
                
                const cleanID = removeAccents(idStr).replace(/^0+/, '');
                
                if (existingIDs.has(cleanID)) {
                    duplicateCount++;
                } else {
                    // Độn thêm cột cho đủ 53 cột
                    while (row.length < 53) {
                        row.push('');
                    }
                    newStudents.push(row);
                }
            });
            
            alert(`Tìm thấy ${newStudents.length} học sinh mới.\nBỏ qua ${duplicateCount} học sinh đã tồn tại.`);
            
            if (newStudents.length > 0) {
                const originalBtnText = uploadBtn.innerHTML;
                uploadBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang tải...';
                uploadBtn.disabled = true;
                
                fetch(SCRIPT_URL, {
                    method: 'POST',
                    body: JSON.stringify({ 
                        password: uploadPass,
                        action: 'addStudents',
                        newStudents: newStudents
                    })
                })
                .then(r => r.json())
                .then(res => {
                    if (res.status === 'success') {
                        alert('Cập nhật thành công! Đang tải lại dữ liệu...');
                        performSearch();
                    } else {
                        alert('Lỗi khi lưu lên server: ' + res.message);
                    }
                })
                .catch(err => {
                    console.error(err);
                    alert('Lỗi mạng khi gửi dữ liệu!');
                })
                .finally(() => {
                    uploadBtn.innerHTML = originalBtnText;
                    uploadBtn.disabled = false;
                    fileUploadInput.value = ''; // Reset input
                });
            } else {
                fileUploadInput.value = ''; // Reset input
            }
        };
        reader.readAsArrayBuffer(file);
    });
}

function printForm(stt) {
    const student = studentsData.find(s => s[0] == stt);
    if (!student) return;

    // A. Thông tin học sinh
    document.getElementById('p-stt').textContent = student[0] || '';
    document.getElementById('p-name').textContent = (student[3] || '').toUpperCase();
    document.getElementById('p-name-2').textContent = (student[3] || '').toUpperCase(); // Cho mặt sau
    document.getElementById('p-gender').textContent = student[4] || '';
    document.getElementById('p-ethic').textContent = student[7] || 'Kinh';
    document.getElementById('p-dob').textContent = student[5] || '';
    document.getElementById('p-pob').textContent = student[6] || '';
    document.getElementById('p-id').textContent = student[1] || '';
    document.getElementById('p-school').textContent = student[10] || '';
    
    // Nơi ở hiện tại
    // Số nhà lấy đúng cột T (index 19) theo yêu cầu.
    const soNha = student[19] || '';
    document.getElementById('p-address').textContent = soNha;
    
    document.getElementById('p-to').textContent = student[17] ? student[17] : '................................................';
    document.getElementById('p-khu').textContent = student[16] || '';
    document.getElementById('p-phuong').textContent = student[15] || '';
    
    // Thành phố lấy đúng cột O (index 14) theo yêu cầu.
    const thanhPho = student[14] || '';
    document.getElementById('p-tinh').textContent = thanhPho ? thanhPho : 'Thành phố Hồ Chí Minh';

    // B. Thông tin liên hệ
    let parentName = '';
    let parentRole = '';
    let parentPhone = '';

    if (student[25] && student[25].trim() !== '') {
        parentName = student[25];
        parentRole = 'Mẹ';
        parentPhone = student[29] || student[26] || '';
    } else if (student[20] && student[20].trim() !== '') {
        parentName = student[20];
        parentRole = 'Cha';
        parentPhone = student[24] || student[21] || '';
    } else if (student[30] && student[30].trim() !== '') {
        parentName = student[30];
        parentRole = 'Người giám hộ';
        parentPhone = student[34] || student[31] || '';
    }

    document.getElementById('p-parent-name').textContent = parentName;
    document.getElementById('p-parent-role').textContent = parentRole;
    document.getElementById('p-parent-phone').textContent = parentPhone;

    window.print();
}

window.showBatchPrintModal = function() {
    document.getElementById('batchPrintModal').style.display = 'flex';
};

window.executeBatchPrint = function() {
    if (!isAdmin) return;
    if (!fullAdminData) {
        alert("Dữ liệu đang được tải về từ máy chủ, vui lòng thử lại sau vài giây...");
        return;
    }

    if (adminRole !== 'super') {
        const p = prompt('Vui lòng nhập mật khẩu cấp cao (khoa186) để In hàng loạt:');
        if (!p) return;
        
        const btn = document.getElementById('batchPrintExecBtn');
        if (btn) btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Đang xác thực...';
        
        fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'verifySuper', password: p })
        }).then(r => r.json()).then(res => {
            if (res.status === 'success') {
                adminRole = 'super';
                adminSessionPassword = p;
                if (btn) btn.innerHTML = '<i class="fa-solid fa-print"></i> Tiến hành In';
                doBatchPrint();
            } else {
                if (btn) btn.innerHTML = '<i class="fa-solid fa-print"></i> Tiến hành In';
                alert('Sai mật khẩu cấp cao!');
            }
        }).catch(err => {
            if (btn) btn.innerHTML = '<i class="fa-solid fa-print"></i> Tiến hành In';
            alert('Lỗi mạng!');
        });
        return;
    }

    doBatchPrint();
};

function doBatchPrint() {
    if (!isAdmin) return;
    if (!fullAdminData) {
        alert("Dữ liệu đang được tải về từ máy chủ, vui lòng thử lại sau vài giây...");
        return;
    }

    const startIdxInput = document.getElementById('batchStartIdx').value;
    const endIdxInput = document.getElementById('batchEndIdx').value;
    const printAll = document.getElementById('batchPrintAll').checked;

    let studentsToPrint = [];

    if (printAll) {
        studentsToPrint = fullAdminData.filter(s => {
            const hasRegistered = (s[49] || '').toString().trim().toLowerCase() === 'x';
            return !hasRegistered;
        });
    } else {
        const start = parseInt(startIdxInput);
        const end = parseInt(endIdxInput);

        if (isNaN(start) || isNaN(end) || start > end) {
            alert('Khoảng số thứ tự không hợp lệ!');
            return;
        }

        studentsToPrint = fullAdminData.filter(s => {
            const stt = parseInt(s[0]);
            const hasRegistered = (s[49] || '').toString().trim().toLowerCase() === 'x';
            return !isNaN(stt) && stt >= start && stt <= end && !hasRegistered;
        });
    }

    if (studentsToPrint.length === 0) {
        alert('Không tìm thấy học sinh nào thỏa mãn điều kiện in!');
        return;
    }

    const wrapper = document.getElementById('batchPrintWrapper');
    wrapper.innerHTML = '';
    
    // We must query '.print-area' from index.html (the single single-print template is actually #printArea, wait! In HTML, does #printArea exist or .print-area?)
    // Let me check index.html. Actually the old code used document.getElementById('printArea').
    const template = document.getElementById('printArea');
    if (!template) {
        alert("Không tìm thấy trang mẫu để in.");
        return;
    }

    studentsToPrint.forEach(student => {
        const clone = template.cloneNode(true);
        clone.removeAttribute('id');
        clone.style.position = 'relative';
        clone.style.pageBreakAfter = 'always';
        clone.style.pageBreakBefore = 'avoid';
        clone.style.display = 'block';

        const el_stt = clone.querySelector('#p-stt'); if(el_stt) el_stt.textContent = student[0] || '';
        const el_name = clone.querySelector('#p-name'); if(el_name) el_name.textContent = (student[3] || '').toUpperCase();
        const el_name2 = clone.querySelector('#p-name-2'); if(el_name2) el_name2.textContent = (student[3] || '').toUpperCase();
        const el_gender = clone.querySelector('#p-gender'); if(el_gender) el_gender.textContent = student[4] || '';
        const el_ethic = clone.querySelector('#p-ethic'); if(el_ethic) el_ethic.textContent = student[7] || 'Kinh';
        const el_dob = clone.querySelector('#p-dob'); if(el_dob) el_dob.textContent = student[5] || '';
        const el_pob = clone.querySelector('#p-pob'); if(el_pob) el_pob.textContent = student[6] || '';
        const el_id = clone.querySelector('#p-id'); if(el_id) el_id.textContent = student[1] || '';
        const el_school = clone.querySelector('#p-school'); if(el_school) el_school.textContent = student[10] || '';
        
        const soNha = student[19] || '';
        const el_address = clone.querySelector('#p-address'); if(el_address) el_address.textContent = soNha;
        const el_to = clone.querySelector('#p-to'); if(el_to) el_to.textContent = student[17] ? student[17] : '................................................';
        const el_khu = clone.querySelector('#p-khu'); if(el_khu) el_khu.textContent = student[16] || '';
        const el_phuong = clone.querySelector('#p-phuong'); if(el_phuong) el_phuong.textContent = student[15] || '';
        
        const thanhPho = student[14] || '';
        const el_tinh = clone.querySelector('#p-tinh'); if(el_tinh) el_tinh.textContent = thanhPho ? thanhPho : 'Thành phố Hồ Chí Minh';

        let parentName = '';
        let parentRole = '';
        let parentPhone = '';

        if (student[25] && student[25].trim() !== '') {
            parentName = student[25];
            parentRole = 'Mẹ';
            parentPhone = student[29] || student[26] || '';
        } else if (student[20] && student[20].trim() !== '') {
            parentName = student[20];
            parentRole = 'Cha';
            parentPhone = student[24] || student[21] || '';
        } else if (student[30] && student[30].trim() !== '') {
            parentName = student[30];
            parentRole = 'Người giám hộ';
            parentPhone = student[34] || student[31] || '';
        }

        const el_pname = clone.querySelector('#p-parent-name'); if(el_pname) el_pname.textContent = parentName;
        const el_prole = clone.querySelector('#p-parent-role'); if(el_prole) el_prole.textContent = parentRole;
        const el_pphone = clone.querySelector('#p-parent-phone'); if(el_pphone) el_pphone.textContent = parentPhone;
        
        const elementsWithId = clone.querySelectorAll('[id]');
        elementsWithId.forEach(el => el.removeAttribute('id'));

        wrapper.appendChild(clone);
    });

    document.body.classList.add('batch-print');
    wrapper.style.display = 'block';
    const batchModal = document.getElementById('batchPrintModal');
    if (batchModal) batchModal.style.display = 'none';

    setTimeout(() => {
        window.print();
        document.body.classList.remove('batch-print');
        wrapper.style.display = 'none';
        wrapper.innerHTML = '';
    }, 1000);
}
