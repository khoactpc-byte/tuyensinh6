const CSV_URL = 'https://docs.google.com/spreadsheets/d/1NmIUZM9xSiWx5wk7Sun-nP-L4zSSLAKDXhvQcneueZc/export?format=csv';
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
    
    Papa.parse(CSV_URL, {
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

// Search Logic
function performSearch() {
    const query = searchInput.value.trim();
    
    if (query === '' && !isAdmin) {
        resultsContainer.innerHTML = '';
        return;
    }

    const normalizedQuery = removeAccents(query);
    
    // Filter data
    const filteredResults = studentsData.filter(student => {
        const rawSTT = student[0] ? student[0].toString() : '';
        const rawName = student[1] || '';
        const rawID = student[2] || '';
        
        const sttMatch = isAdmin && rawSTT === normalizedQuery;
        const nameMatch = removeAccents(rawName).includes(normalizedQuery);
        const idMatch = removeAccents(rawID).includes(normalizedQuery);
        
        return sttMatch || nameMatch || idMatch;
    });

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
                        <span class="stt-label">STT</span>
                        <span class="stt-number">${stt}</span>
                    </div>
                </div>
                <div class="card-body">
                    <div class="detail-item"><i class="fa-regular fa-calendar"></i> <strong>Ngày sinh:</strong> ${dob}</div>
                    <div class="detail-item"><i class="fa-solid fa-school"></i> <strong>Trường:</strong> ${school}</div>
                    <div class="detail-item"><i class="fa-solid fa-location-dot"></i> <strong>Địa chỉ:</strong> ${address}</div>
                </div>
        `;
        
        if (isAdmin) {
            const isEnrolled = (student[9] || '').trim().toLowerCase() === 'x';
            const hasEnglish = (student[10] || '').trim().toLowerCase() === 'x';
            const note = student[11] || '';
            cardHTML += `
                <div class="admin-actions">
                    <label><input type="checkbox" id="check_${stt}" ${isEnrolled ? 'checked' : ''}> Đã nộp hồ sơ nhập học</label>
                    <label><input type="checkbox" id="eng_${stt}" ${hasEnglish ? 'checked' : ''}> Có chứng chỉ Tiếng Anh</label>
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
        if (searchInput.value.trim() !== '') performSearch();
    } else {
        adminError.classList.remove('hidden');
    }
}

submitAdminBtn.addEventListener('click', handleLogin);
adminPassword.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleLogin(); });

window.updateStudent = function(stt) {
    if (!SCRIPT_URL) { alert("Thiết lập SCRIPT_URL!"); return; }
    const isEnrolled = document.getElementById(`check_${stt}`).checked;
    const hasEnglish = document.getElementById(`eng_${stt}`).checked;
    const note = document.getElementById(`note_${stt}`).value;
    const btn = document.getElementById(`btn_${stt}`);
    btn.disabled = true;
    btn.innerText = 'Đang lưu...';

    fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ 
            password: 'nan123', 
            stt: stt, 
            daNhapHoc: isEnrolled ? 'x' : '', 
            tiengAnh: hasEnglish ? 'x' : '', 
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
                studentsData[idx][11] = note; 
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
});
