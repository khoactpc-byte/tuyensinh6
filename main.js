const CSV_URL = 'https://docs.google.com/spreadsheets/d/1NmIUZM9xSiWx5wk7Sun-nP-L4zSSLAKDXhvQcneueZc/gviz/tq?tqx=out:csv&sheet=DATA';
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
            studentsData = results.data.slice(1);
            statusMessage.textContent = 'Dữ liệu đã sẵn sàng. Vui lòng nhập thông tin để tra cứu.';
            
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
    const antiCacheUrl = `${CONFIG_CSV_URL}&t=${new Date().getTime()}`;
    Papa.parse(antiCacheUrl, {
        download: true,
        header: false,
        skipEmptyLines: true,
        complete: function(results) {
            if (results.data && results.data.length > 0) {
                const configRow = results.data[0];
                const isEnabled = configRow[0] === 'TRUE' || configRow[0] === 'true' || configRow[0] === true;
                const text = configRow[1] || '';
                
                configEnableNotif.checked = isEnabled;
                configNotifText.value = text;

                if (isEnabled && text.trim() !== '') {
                    tickerText.innerHTML = `<i class="fa-solid fa-bullhorn" style="color: #ffe600; margin-right: 10px; font-size: 1.2rem; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));"></i> ${text}`;
                    newsTicker.style.display = 'block';
                } else {
                    newsTicker.style.display = 'none';
                }
            }
        },
        error: function(err) {
            console.error('Lỗi tải config:', err);
        }
    });
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
        const rawName = student[1] || '';
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
        const name = student[1] || 'Không có thông tin';
        const id = student[2] || 'Không có thông tin';
        const dob = student[3] || 'Không có thông tin';
        const school = student[4] || 'Không có thông tin';
        const phuongXa = student[5] || '';
        const khuPho = student[6] || '';
        const soNha = student[7] || '';
        const time = student[8] || 'Không có thông tin';

        // Combine address
        const addressParts = [soNha, khuPho, phuongXa].filter(part => part && part.trim() !== '');
        const address = addressParts.length > 0 ? addressParts.join(', ') : 'Không có thông tin';

        let cardHTML = `
            <div class="result-card">
                <div class="card-header">
                    <div class="student-info">
                        <h2>${name}</h2>
                        <div class="student-id"><i class="fa-regular fa-id-card"></i> Mã định danh: ${id}</div>
                        <div class="student-time" style="color: #ef4444; font-weight: bold; margin-top: 5px; font-size: 0.95rem;">
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
            const isEnrolled = (student[9] || '').trim().toLowerCase() === 'x';
            const hasEnglish = (student[10] || '').trim().toLowerCase() === 'x';
            const isTransfer = (student[11] || '').trim().toLowerCase() === 'x';
            const note = student[12] || '';
            cardHTML += `
                <div class="admin-actions">
                    <label><input type="checkbox" id="check_${stt}" ${isEnrolled ? 'checked' : ''}> Đã nộp hồ sơ nhập học</label>
                    <label><input type="checkbox" id="eng_${stt}" ${hasEnglish ? 'checked' : ''}> Có chứng chỉ Tiếng Anh</label>
                    <label><input type="checkbox" id="transfer_${stt}" ${isTransfer ? 'checked' : ''}> Chuyển trường</label>
                    <textarea id="note_${stt}" placeholder="Ghi chú...">${note}</textarea>
                    <button onclick="updateStudent('${stt}')" id="btn_${stt}">Lưu dữ liệu</button>
                </div>
            `;
        }

        cardHTML += `</div>`;
        resultsContainer.insertAdjacentHTML('beforeend', cardHTML);
    });
}

// Event Listeners
searchBtn.addEventListener('click', performSearch);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') performSearch();
});

// Admin Modal Logic
adminLoginBtn.addEventListener('click', () => {
    if (isAdmin) {
        isAdmin = false;
        adminLoginBtn.innerHTML = '<i class="fa-solid fa-lock"></i> Admin';
        adminLoginBtn.style.background = '';
        openSheetBtn.classList.add('hidden');
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
        adminModal.classList.add('hidden');
        adminLoginBtn.innerHTML = '<i class="fa-solid fa-lock-open"></i> Thoát Admin';
        adminLoginBtn.style.background = '#10b981';
        openSheetBtn.classList.remove('hidden');
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
            btn.innerText = 'Đã lưu ✓';
            const idx = studentsData.findIndex(s => s[0] == stt);
            if (idx !== -1) { 
                studentsData[idx][9] = isEnrolled ? 'x' : ''; 
                studentsData[idx][10] = hasEnglish ? 'x' : ''; 
                studentsData[idx][11] = isTransfer ? 'x' : '';
                studentsData[idx][12] = note; 
            }
        } else { alert('Lỗi: ' + res.message); btn.innerText = 'Lưu dữ liệu'; btn.disabled = false; }
    })
    .catch(e => { alert('Lỗi mạng!'); btn.innerText = 'Lưu dữ liệu'; btn.disabled = false; });
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    searchInput.disabled = true;
    searchBtn.disabled = true;
    
    // Load data
    loadData();
    loadConfig();
});
