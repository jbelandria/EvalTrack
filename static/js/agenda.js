const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
let activities = [];

async function loadAgenda() {
    try {
        const response = await fetch('/api/agenda');
        activities = await response.json();
        renderAgenda();
    } catch (error) {
        showNotification('Error al cargar la agenda', 'error');
    }
}

function renderAgenda() {
    const grid = document.getElementById('agendaGrid');
    grid.innerHTML = '';
    
    days.forEach(day => {
        const dayActivities = activities.filter(a => a.day_of_week === day);
        
        const dayCard = document.createElement('div');
        dayCard.className = 'bg-white rounded-lg shadow-lg p-4';
        
        dayCard.innerHTML = `
            <h3 class="text-lg font-bold text-gray-800 mb-3 border-b pb-2">${day}</h3>
            <div class="space-y-2">
                ${dayActivities.length === 0 ? 
                    '<p class="text-gray-500 text-sm italic">Sin actividades</p>' :
                    dayActivities.map(activity => `
                        <div class="bg-blue-50 p-3 rounded-lg border border-blue-200">
                            <div class="flex justify-between items-start mb-1">
                                <span class="text-sm font-semibold text-blue-800">${activity.time_start} - ${activity.time_end}</span>
                                <div class="space-x-1">
                                    <button onclick="editActivity(${activity.id})" class="text-blue-600 hover:text-blue-800">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button onclick="deleteActivity(${activity.id})" class="text-red-600 hover:text-red-800">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                            <p class="text-sm text-gray-800 font-medium">${activity.activity}</p>
                            ${activity.subject ? `<p class="text-xs text-gray-600 mt-1"><i class="fas fa-book mr-1"></i>${activity.subject}</p>` : ''}
                        </div>
                    `).join('')
                }
            </div>
        `;
        
        grid.appendChild(dayCard);
    });
}

function openAddModal() {
    document.getElementById('modalTitle').textContent = 'Agregar Actividad';
    document.getElementById('activityForm').reset();
    document.getElementById('activityId').value = '';
    document.getElementById('activityModal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('activityModal').classList.add('hidden');
}

function editActivity(id) {
    const activity = activities.find(a => a.id === id);
    if (!activity) return;
    
    document.getElementById('modalTitle').textContent = 'Editar Actividad';
    document.getElementById('activityId').value = activity.id;
    document.getElementById('dayOfWeek').value = activity.day_of_week;
    document.getElementById('timeStart').value = activity.time_start;
    document.getElementById('timeEnd').value = activity.time_end;
    document.getElementById('activity').value = activity.activity;
    document.getElementById('subject').value = activity.subject || '';
    document.getElementById('activityModal').classList.remove('hidden');
}

async function deleteActivity(id) {
    if (!confirm('¿Estás seguro de eliminar esta actividad?')) return;
    
    try {
        const response = await fetch(`/api/agenda/${id}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        if (data.success) {
            showNotification('Actividad eliminada', 'success');
            loadAgenda();
        }
    } catch (error) {
        showNotification('Error al eliminar actividad', 'error');
    }
}

document.getElementById('activityForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const activityId = document.getElementById('activityId').value;
    const data = {
        day_of_week: document.getElementById('dayOfWeek').value,
        time_start: document.getElementById('timeStart').value,
        time_end: document.getElementById('timeEnd').value,
        activity: document.getElementById('activity').value,
        subject: document.getElementById('subject').value
    };
    
    try {
        const url = activityId ? `/api/agenda/${activityId}` : '/api/agenda';
        const method = activityId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        if (result.success) {
            showNotification(activityId ? 'Actividad actualizada' : 'Actividad agregada', 'success');
            closeModal();
            loadAgenda();
        }
    } catch (error) {
        showNotification('Error al guardar actividad', 'error');
    }
});

loadAgenda();
