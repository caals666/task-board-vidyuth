// Local storage management for tasks
const Storage = {
    // Get all tasks from localStorage
    getTasks: () => {
        const tasksJSON = localStorage.getItem('kanban-tasks');
        return tasksJSON ? JSON.parse(tasksJSON) : [];
    },

    // Save all tasks to localStorage
    saveTasks: (tasks) => {
        localStorage.setItem('kanban-tasks', JSON.stringify(tasks));
    },

    // Generate a unique task ID
    generateTaskId: () => {
        return 'T' + Date.now();
    },

    // Get the next task ID in sequence
    getNextTaskId: () => {
        const tasks = Storage.getTasks();
        if (tasks.length === 0) return 'T1';
        
        const ids = tasks.map(task => {
            const idNum = parseInt(task.id.substring(1));
            return isNaN(idNum) ? 0 : idNum;
        });
        
        const maxId = Math.max(...ids);
        return 'T' + (maxId + 1);
    }
};