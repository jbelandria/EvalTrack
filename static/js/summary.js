let summary = [];

async function loadSummary() {
    try {
        const response = await fetch('/api/summary');
        summary = await response.json();
        renderSummary();
    } catch (error) {
        showNotification('Error al cargar resumen', 'error');
    }
}

function renderSummary() {
    const grid = document.getElementById('summaryGrid');
    grid.innerHTML = '';
    
    if (summary.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full bg-white p-8 rounded-lg shadow-lg text-center">
                <i class="fas fa-chart-line text-6xl text-gray-300 mb-4"></i>
                <p class="text-gray-600 text-lg">No hay datos para mostrar</p>
                <p class="text-gray-500 mt-2">Agrega evaluaciones para ver tu resumen académico</p>
                <a href="/evaluations" class="inline-block mt-4 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition">
                    Ir a Evaluaciones
                </a>
            </div>
        `;
        return;
    }
    
    const totalAverage = summary.length > 0 
        ? (summary.reduce((sum, s) => sum + s.final_grade, 0) / summary.length).toFixed(2)
        : 0;
    
    const passedSubjects = summary.filter(s => s.final_grade >= 10).length;
    const failedSubjects = summary.filter(s => s.final_grade < 10).length;
    
    const overallCard = document.createElement('div');
    overallCard.className = 'col-span-full bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-lg shadow-lg';
    overallCard.innerHTML = `
        <h2 class="text-2xl font-bold mb-4">Resumen General</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="bg-white bg-opacity-20 p-4 rounded-lg">
                <p class="text-sm opacity-90">Promedio General</p>
                <p class="text-3xl font-bold">${totalAverage}</p>
            </div>
            <div class="bg-white bg-opacity-20 p-4 rounded-lg">
                <p class="text-sm opacity-90">Materias Aprobadas</p>
                <p class="text-3xl font-bold">${passedSubjects}</p>
            </div>
            <div class="bg-white bg-opacity-20 p-4 rounded-lg">
                <p class="text-sm opacity-90">Materias Aplazadas</p>
                <p class="text-3xl font-bold">${failedSubjects}</p>
            </div>
        </div>
    `;
    grid.appendChild(overallCard);
    
    summary.forEach(subject => {
        const isPassed = subject.final_grade >= 10;
        const card = document.createElement('div');
        card.className = 'bg-white rounded-lg shadow-lg p-6 border-t-4 ' + 
            (isPassed ? 'border-green-500' : 'border-red-500');
        
        card.innerHTML = `
            <div class="flex justify-between items-start mb-3">
                <h3 class="text-lg font-bold text-gray-800">${subject.subject_name}</h3>
                <span class="px-3 py-1 rounded-full text-xs font-semibold ${
                    isPassed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }">
                    ${subject.status}
                </span>
            </div>
            
            <div class="space-y-2">
                <div class="flex justify-between items-center">
                    <span class="text-gray-600">Nota Final:</span>
                    <span class="text-2xl font-bold ${isPassed ? 'text-green-600' : 'text-red-600'}">
                        ${subject.final_grade.toFixed(2)}
                    </span>
                </div>
                
                <div class="flex justify-between items-center text-sm">
                    <span class="text-gray-600">Evaluaciones:</span>
                    <span class="font-medium">${subject.total_evaluations}</span>
                </div>
                
                <div class="mt-4 bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div class="h-full rounded-full ${isPassed ? 'bg-green-500' : 'bg-red-500'}" 
                         style="width: ${(subject.final_grade / 20 * 100).toFixed(1)}%">
                    </div>
                </div>
                <p class="text-xs text-gray-500 text-right">${(subject.final_grade / 20 * 100).toFixed(1)}%</p>
            </div>
        `;
        
        grid.appendChild(card);
    });
}

loadSummary();
