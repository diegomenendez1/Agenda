const assert = require('assert');

// Simulación de Estado
const team = {
    'userA': { id: 'userA', reportsTo: 'userB' },
    'userB': { id: 'userB', reportsTo: 'userA' } // CIRCULAR!
};

function processHierarchy(teamData) {
    const processedTeam = { ...teamData };
    Object.values(processedTeam).forEach((member) => {
        if (member.reportsTo && processedTeam[member.reportsTo]) {
            if (!processedTeam[member.reportsTo].directReports) {
                processedTeam[member.reportsTo].directReports = [];
            }
            if (!processedTeam[member.reportsTo].directReports.includes(member.id)) {
                processedTeam[member.reportsTo].directReports.push(member.id);
            }
        }
    });
    return processedTeam;
}

console.log("--- Caso Borde: Referencia Circular ---");
try {
    const result = processHierarchy(team);
    console.log("Resultado userA directReports:", result['userA'].directReports);
    console.log("Resultado userB directReports:", result['userB'].directReports);
    console.log("Hallazgo: El sistema NO rompe el stack (no hay bucle infinito) porque itera sobre llaves fijas.");
    console.log("Hallazgo: Sin embargo, la lógica de negocio es inválida (A manda a B y B manda a A).");
} catch (e) {
    console.error("Error catastrófico en jerarquía:", e.message);
}

// Escenario: Borrado de Manager
console.log("\n--- Caso Borde: Manager Eliminado ---");
const tasks = {
    't1': { id: 't1', ownerId: 'userC', status: 'review', managerId: 'managerX' }
};
const teamWithMissingManager = {
    'userC': { id: 'userC', reportsTo: 'managerX' }
    // managerX no existe en el objeto team
};

function checkVisibility(task, user, teamData) {
    if (task.ownerId === user.id) return true;
    const owner = teamData[task.ownerId];
    if (!owner) return false;
    if (owner.reportsTo === user.id) return true;
    return false;
}

const canSomeoneReview = checkVisibility(tasks['t1'], { id: 'managerX' }, teamWithMissingManager);
console.log(`¿Puede el manager fantasma ver la tarea?: ${canSomeoneReview ? 'SI' : 'NO'}`);
console.log("Hallazgo: Si el manager es borrado del sistema, la tarea queda en un 'limbo de revisión' inaccesible.");
