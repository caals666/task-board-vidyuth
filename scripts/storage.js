// Local storage management for tasks
const Storage = {
    STORAGE_KEY: 'kanban-tasks',
    DELETED_STORAGE_KEY: 'kanban-deleted-tasks',

    // Get all active tasks from localStorage
    getTasks: () => {
        const tasksJSON = localStorage.getItem(Storage.STORAGE_KEY);
        return tasksJSON ? JSON.parse(tasksJSON) : [];
    },

    // Get all soft-deleted tasks
    getDeletedTasks: () => {
        const tasksJSON = localStorage.getItem(Storage.DELETED_STORAGE_KEY);
        return tasksJSON ? JSON.parse(tasksJSON) : [];
    },

    // Save all active tasks to localStorage
    saveTasks: (tasks) => {
        localStorage.setItem(Storage.STORAGE_KEY, JSON.stringify(tasks));
    },

    // Save deleted tasks
    saveDeletedTasks: (tasks) => {
        localStorage.setItem(Storage.DELETED_STORAGE_KEY, JSON.stringify(tasks));
    },

    // Generate a unique task ID
    generateTaskId: () => {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        return `T${timestamp}${random}`;
    },

    // Soft delete a task (move to deleted storage)
    softDeleteTask: (taskId) => {
        const tasks = Storage.getTasks();
        const deletedTasks = Storage.getDeletedTasks();
        
        const taskIndex = tasks.findIndex(task => task.id === taskId);
        if (taskIndex !== -1) {
            const [deletedTask] = tasks.splice(taskIndex, 1);
            deletedTask.deletedAt = new Date().toISOString();
            deletedTasks.push(deletedTask);
            
            Storage.saveTasks(tasks);
            Storage.saveDeletedTasks(deletedTasks);
            return true;
        }
        return false;
    },

    // Permanently delete tasks (cleanup old deleted tasks)
    cleanupOldDeletedTasks: (daysOld = 30) => {
        const deletedTasks = Storage.getDeletedTasks();
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);
        
        const updatedDeletedTasks = deletedTasks.filter(task => {
            const deletedDate = new Date(task.deletedAt);
            return deletedDate > cutoffDate;
        });
        
        Storage.saveDeletedTasks(updatedDeletedTasks);
    },

    // Initialize with sample data if empty
    initializeWithSampleData: () => {
        const tasks = Storage.getTasks();
        if (tasks.length === 0) {
            const sampleTasks = [
                {
                    id: Storage.generateTaskId(),
                    title: "Build UI components",
                    description: "Create reusable React components for the task board",
                    priority: "high",
                    tags: ["frontend", "react"],
                    dueDate: "2025-11-30",
                    status: "todo",
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                },
                {
                    id: Storage.generateTaskId(),
                    title: "Implement drag and drop",
                    description: "Add HTML5 drag and drop functionality between columns",
                    priority: "medium",
                    tags: ["javascript", "ui"],
                    dueDate: "2025-11-30",
                    status: "in-progress",
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                },
                {
                    id: Storage.generateTaskId(),
                    title: "Setup local storage",
                    description: "Implement persistence using browser localStorage",
                    priority: "low",
                    tags: ["javascript", "storage"],
                    dueDate: "2025-11-30",
                    status: "done",
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
            ];
            Storage.saveTasks(sampleTasks);
        }
    }
};