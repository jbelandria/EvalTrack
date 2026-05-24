let evaluations = [];
let subjects = [];

async function loadSubjects() {
    try {
        const response = await fetch('/api/subjects');
        subjects = await response.json();
        updateSubjectSelect();
    } catch (error) {
        showNotification('Error al cargar materias', 'error');
    }
}

function updateSubjectSelect() {
    const select = document.getElementById('subjectId');
    select.innerHTML = '<option value="">Seleccionar materia</option>';
    subjects.forEach(subject => {
        const option = document.createElement('option');
        option.value = subject.id;
        option.textContent = subject.name;
        select.appendChild(option);
    });
}

async function addNewSubject() {
    const subjectName = prompt('Nombre de la nueva materia:');
    if (!subjectName) return;
    
    try {
        const response = await fetch('/api/subjects', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({name: subjectName})
        });
        
        const data = await response.json();
        if (data.success) {
            showNotification('Materia agregada', 'success');
            await loadSubjects();
            document.getElementById('subjectId').value = data.id;
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        showNotification('Error al agregar materia', 'error');
    }
}

async function loadEvaluations() {
    try {
        const response = await fetch('/api/evaluations');
        evaluations = await response.json();
        renderEvaluations();
    } catch (error) {
        showNotification('Error al cargar evaluaciones', 'error');
    }
}

function renderEvaluations() {
    const tbody = document.getElementById('evaluationsTable');
    tbody.innerHTML = '';
    
    if (evaluations.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-8 text-center text-gray-500">
                    No hay evaluaciones registradas. ¡Agrega tu primera evaluación!
                </td>
            </tr>
        `;
        return;
    }
    
    evaluations.forEach(evaluation => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        
        const gradeColor = evaluation.grade >= 10 ? 'text-green-600' : 'text-red-600';
        
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${evaluation.subject_name}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${evaluation.evaluation_type}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-bold ${gradeColor}">${evaluation.grade.toFixed(2)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${evaluation.weight}%</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${evaluation.date_completed}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                <button onclick="editEvaluation(${evaluation.id})" class="text-blue-600 hover:text-blue-800">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteEvaluation(${evaluation.id})" class="text-red-600 hover:text-red-800">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

function openAddModal() {
    document.getElementById('modalTitle').textContent = 'Agregar Evaluación';
    document.getElementById('evaluationForm').reset();
    document.getElementById('evaluationId').value = '';
    document.getElementById('evaluationModal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('evaluationModal').classList.add('hidden');
}

function editEvaluation(id) {
    const evaluation = evaluations.find(e => e.id === id);
    if (!evaluation) return;
    
    document.getElementById('modalTitle').textContent = 'Editar Evaluación';
    document.getElementById('evaluationId').value = evaluation.id;
    document.getElementById('subjectId').value = evaluation.subject_id;
    document.getElementById('evaluationType').value = evaluation.evaluation_type;
    document.getElementById('grade').value = evaluation.grade;
    document.getElementById('weight').value = evaluation.weight;
    document.getElementById('evaluationModal').classList.remove('hidden');
}

async function deleteEvaluation(id) {
    if (!confirm('¿Estás seguro de eliminar esta evaluación?')) return;
    
    try {
        const response = await fetch(`/api/evaluations/${id}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        if (data.success) {
            showNotification('Evaluación eliminada', 'success');
            loadEvaluations();
        }
    } catch (error) {
        showNotification('Error al eliminar evaluación', 'error');
    }
}

document.getElementById('evaluationForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const evaluationId = document.getElementById('evaluationId').value;
    const data = {
        subject_id: parseInt(document.getElementById('subjectId').value),
        evaluation_type: document.getElementById('evaluationType').value,
        grade: parseFloat(document.getElementById('grade').value),
        weight: parseFloat(document.getElementById('weight').value)
    };
    
    if (data.grade < 1 || data.grade > 20) {
        showNotification('La nota debe estar entre 1 y 20', 'error');
        return;
    }
    
    try {
        const url = evaluationId ? `/api/evaluations/${evaluationId}` : '/api/evaluations';
        const method = evaluationId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        if (result.success) {
            showNotification(evaluationId ? 'Evaluación actualizada' : 'Evaluación agregada', 'success');
            closeModal();
            loadEvaluations();
        }
    } catch (error) {
        showNotification('Error al guardar evaluación', 'error');
    }
});

loadSubjects();
loadEvaluations();
