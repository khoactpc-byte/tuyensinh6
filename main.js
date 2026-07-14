const CSV_URL = 'https://docs.google.com/spreadsheets/d/1NmIUZM9xSiWx5wk7Sun-nP-L4zSSLAKDXhvQcneueZc/gviz/tq?tqx=out:csv&sheet=tuyensinh';
const CONFIG_CSV_URL = 'https://docs.google.com/spreadsheets/d/1NmIUZM9xSiWx5wk7Sun-nP-L4zSSLAKDXhvQcneueZc/gviz/tq?tqx=out:csv&sheet=CONFIG';
let SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxCYWMAbkmeiZXyvaCkwTYmlU0yyIaZgQSPwW7jcL8GjZdksIHltafvroHAgyLt-4pLKg/exec';

let studentsData = [];
let isAdmin = false; // Trạng thái Admin

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
    statusMessage.textContent = 'Đang tải dữ liệu, vui lòng đợi...';
    const antiCacheUrl = `${CSV_URL}&t=${new Date().getTime()}`;
    
    Papa.parse(antiCacheUrl, {
        download: true,
        header: false,
        skipEmptyLines: true,
        complete: function(results) {
            // Remove the first row (headers)
            studentsData = results.data.slice(2);
            statusMessage.textContent = 'Dữ liệu đã sẵn sàng. Vui lòng nhập thông tin để tra cứu.';
            statusMessage.style.color = 'var(--text-muted)';
            statusMessage.style.display = 'block';
            
            // Enable search
            searchInput.disabled = false;
            searchBtn.disabled = false;
        },
        error: function(error) {
            console.error('Lỗi khi tải dữ liệu:', error);
            statusMessage.textContent = 'Có lỗi xảy ra khi tải dữ liệu. Vui lòng thử lại sau.';
            statusMessage.style.color = 'var(--highlight)';
        }
    });
}

function loadConfig() {
    fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ 
            password: 'nan123',
            action: 'getConfig'
        })
    })
    .then(r => r.json())
    .then(res => {
        if (res.status === 'success') {
            let isEnabled = res.enableNotification === true || res.enableNotification === 'TRUE' || res.enableNotification === 'true';
            let text = res.notificationText || '';
            
            // Cập nhật giao diện
            if (configEnableNotif) configEnableNotif.checked = isEnabled;
            if (configNotifText) configNotifText.value = text;

            if (isEnabled && text.trim() !== '') {
                tickerText.innerHTML = `<i class="fa-solid fa-bullhorn" style="color: #ffe600; margin-right: 10px; font-size: 1.2rem; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));"></i> ${text}`;
                newsTicker.style.display = 'block';
            } else {
                newsTicker.style.display = 'none';
            }
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

    // Bảo mật: Yêu cầu độ dài tùy theo loại tìm kiếm (Tên hay Mã định danh)
    if (!isAdmin) {
        const justDigits = query.replace(/\s/g, '');
        if (/^\d+$/.test(justDigits)) {
            // Nếu nhập toàn số -> Đang tìm ID -> Yêu cầu ít nhất 10 số
            if (justDigits.length < 10) {
                resultsContainer.innerHTML = '<p style="text-align: center; color: #ef4444; margin-top: 20px; font-weight: 500;"><i class="fa-solid fa-circle-exclamation"></i> Vui lòng nhập ít nhất 10 số của Mã định danh để tra cứu.</p>';
                return;
            }
        } else {
            // Nếu có chữ -> Đang tìm Tên -> Yêu cầu ít nhất 4 ký tự
            if (query.length < 4) {
                resultsContainer.innerHTML = '<p style="text-align: center; color: #ef4444; margin-top: 20px; font-weight: 500;"><i class="fa-solid fa-circle-exclamation"></i> Vui lòng nhập ít nhất 4 ký tự tên để tra cứu.</p>';
                return;
            }
        }
    }

    const normalizedQuery = removeAccents(query);
    
    // Filter data
    let filteredResults = studentsData.filter(student => {
        const rawName = student[3] || '';
        const rawID = student[2] || '';
        
        // Remove leading zeros for ID comparison
        const cleanRawID = removeAccents(rawID).replace(/^0+/, '');
        const cleanQueryID = normalizedQuery.replace(/^0+/, '');

        const nameMatch = removeAccents(rawName).includes(normalizedQuery);
        const idMatch = cleanRawID.includes(cleanQueryID);
        
        return nameMatch || idMatch;
    });

    // Ưu tiên tra cứu STT chính xác cho Admin
    if (isAdmin && /^\d+$/.test(normalizedQuery)) {
        const exactSTT = studentsData.filter(student => {
            const rawSTT = student[0] ? student[0].toString() : '';
            return rawSTT === normalizedQuery;
        });
        
        if (exactSTT.length > 0) {
            filteredResults = exactSTT;
        }
    }

    // Bảo mật: Không cho phép hiển thị quá 3 kết quả đối với phụ huynh để tránh rò rỉ dữ liệu
    if (!isAdmin && filteredResults.length > 3) {
        resultsContainer.innerHTML = '<p style="text-align: center; color: #ef4444; margin-top: 20px; font-weight: 500;"><i class="fa-solid fa-shield-halved"></i> Có quá nhiều kết quả (' + filteredResults.length + '). Vui lòng nhập đầy đủ và chính xác Họ Tên hoặc Mã Định Danh để bảo vệ thông tin cá nhân của học sinh.</p>';
        return;
    }

    renderResults(filteredResults, query);
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

        let cardHTML = `
            <div class="result-card">
                <div class="card-header">
                    <div class="student-info">
                        <h2>${name.toUpperCase()}</h2>
                        <div class="student-id"><i class="fa-regular fa-id-card"></i> Số định danh: ${id}</div>
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
                    <div class="detail-item"><i class="fa-solid fa-location-dot"></i> <strong>Địa chỉ:</strong> ${soNha ? soNha : 'Không có thông tin'}</div>
                    <div class="detail-item" style="margin-left: 30px;"><i class="fa-solid fa-map"></i> <strong>Khu phố:</strong> ${khuPho ? khuPho : 'Không có thông tin'}</div>
                    <div class="detail-item" style="margin-left: 30px;"><i class="fa-solid fa-map-location-dot"></i> <strong>Phường/Xã:</strong> ${phuongXa ? phuongXa : 'Không có thông tin'}</div>
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

// Function to fetch fresh data before searching
function refreshAndSearch() {
    const query = searchInput.value.trim();
    if (query === '') {
        resultsContainer.innerHTML = '';
        return;
    }

    // Bảo mật: Yêu cầu độ dài tùy theo loại tìm kiếm (Tên hay Mã định danh)
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

    const originalText = searchBtn.innerHTML;
    searchBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    searchBtn.disabled = true;

    const antiCacheUrl = `${CSV_URL}&t=${new Date().getTime()}`;
    Papa.parse(antiCacheUrl, {
        download: true,
        header: false,
        skipEmptyLines: true,
        complete: function(results) {
            if (results.data && results.data.length > 0) {
                studentsData = results.data;
            }
            performSearch();
            searchBtn.innerHTML = originalText;
            searchBtn.disabled = false;
        },
        error: function(err) {
            console.error('Lỗi tải dữ liệu:', err);
            performSearch();
            searchBtn.innerHTML = originalText;
            searchBtn.disabled = false;
        }
    });
}

// Event Listeners
searchBtn.addEventListener('click', refreshAndSearch);
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
        refreshAndSearch();
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
    if (adminPassword.value === 'nan123') {
        isAdmin = true;
        document.body.classList.add('admin-active');
        adminModal.classList.add('hidden');
        adminLoginBtn.innerHTML = '<i class="fa-solid fa-lock-open"></i> <span class="admin-text">Thoát Admin</span>';
        adminLoginBtn.style.background = '#10b981';
        adminLoginBtn.style.color = 'white';
        openSheetBtn.classList.remove('hidden');
        if (uploadBtn) uploadBtn.classList.remove('hidden');
        const statsBtn = document.getElementById('statsBtn');
        if (statsBtn) statsBtn.classList.remove('hidden');
        adminConfigSection.classList.remove('hidden');
        if (searchInput.value.trim() !== '') performSearch();
    } else {
        adminError.classList.remove('hidden');
    }
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
                password: 'nan123',
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

window.updateStudent = function(stt) {
    if (!SCRIPT_URL) { alert("Thiết lập SCRIPT_URL!"); return; }
    
    // Yêu cầu nhập mật khẩu trước khi cập nhật
    const pass = prompt('Nhập mật khẩu để cập nhật:');
    if (pass !== 'khoa186') {
        if (pass !== null) alert('Sai mật khẩu!');
        return;
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
            password: 'nan123', 
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
            
            // Cập nhật dữ liệu ngay lập tức vào bộ nhớ tạm (không cần F5)
            const studentIndex = studentsData.findIndex(s => s[0] && s[0].toString() === stt.toString());
            if (studentIndex !== -1) {
                // Nếu mảng con chưa đủ dài, cần push thêm phần tử rỗng để tránh lỗi
                while (studentsData[studentIndex].length < 54) {
                    studentsData[studentIndex].push('');
                }
                studentsData[studentIndex][49] = isEnrolled ? 'x' : '';
                studentsData[studentIndex][50] = hasEnglish ? 'x' : '';
                studentsData[studentIndex][51] = isTransfer ? 'x' : '';
                studentsData[studentIndex][52] = note;
            }

            setTimeout(() => {
                btn.innerText = originalText;
                btn.disabled = false;
            }, 2000);
        } else { 
            alert('Lỗi: ' + res.message); 
            btn.innerText = originalText; 
            btn.disabled = false; 
        }
    })
    .catch(e => { 
        alert('Lỗi mạng!'); 
        btn.innerText = originalText; 
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
    
    let total = studentsData.length;
    let nhapHoc = 0;
    let tiengAnh = 0;
    let chuyenTruong = 0;

    studentsData.forEach(student => {
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
                        password: 'nan123',
                        action: 'addStudents',
                        newStudents: newStudents
                    })
                })
                .then(r => r.json())
                .then(res => {
                    if (res.status === 'success') {
                        alert('Cập nhật thành công! Đang tải lại dữ liệu...');
                        refreshAndSearch();
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
