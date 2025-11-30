/* eslint-disable no-undef */
// Main application logic
const App = {
    currentFilter: '',
    currentPriority: 'all',

    init: () => {
        document.addEventListener('DOMContentLoaded', () => {
            App.setupEventListeners();
            DragDrop.init();
            Storage.initializeWithSampleData();
            App.renderTasks();
            App.updateTaskCounts();
            
            // Set up column drop events after DOM is ready
            setTimeout(() => {
                DragDrop.setupColumnDropEvents();
            }, 100);
        });
    },

    setupEventListeners: () => {
        // Add task button
        document.getElementById('add-task-btn').addEventListener('click', () => {
            App.openTaskModal();
        });

        // Add task to column buttons
        document.querySelectorAll('.add-to-column-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const status = e.target.getAttribute('data-column');
                App.openTaskModal(null, status);
            });
        });

        // Modal close button
        document.querySelector('.close').addEventListener('click', () => {
            App.closeTaskModal();
        });

        // Modal outside click
        document.getElementById('task-modal').addEventListener('click', (e) => {
            if (e.target.id === 'task-modal') {
                App.closeTaskModal();
            }
        });

        // Task form submission
        document.getElementById('task-form').addEventListener('submit', (e) => {
            e.preventDefault();
            App.saveTask();
        });

        // Delete task button
        document.getElementById('delete-task-btn').addEventListener('click', () => {
            App.deleteTask();
        });

        // Search input
        document.getElementById('search-input').addEventListener('input', (e) => {
            App.currentFilter = e.target.value.toLowerCase();
            App.renderTasks();
        });

        // Priority filter
        document.getElementById('priority-filter').addEventListener('change', (e) => {
            App.currentPriority = e.target.value;
            App.renderTasks();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                App.closeTaskModal();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                document.getElementById('search-input').focus();
            }
        });
    },

    openTaskModal: (taskId = null, defaultStatus = 'todo') => {
        const modal = document.getElementById('task-modal');
        const modalTitle = document.getElementById('modal-title');
        const deleteBtn = document.getElementById('delete-task-btn');
        
        if (taskId) {
            // Edit existing task
            modalTitle.textContent = 'Edit Task';
            deleteBtn.style.display = 'block';
            App.loadTaskData(taskId);
        } else {
            // Create new task
            modalTitle.textContent = 'Add New Task';
            deleteBtn.style.display = 'none';
            App.resetTaskForm();
            document.getElementById('task-status').value = defaultStatus;
        }
        
        modal.style.display = 'block';
        document.getElementById('task-title').focus();
    },

    closeTaskModal: () => {
        document.getElementById('task-modal').style.display = 'none';
    },

    resetTaskForm: () => {
        document.getElementById('task-form').reset();
        document.getElementById('task-id').value = '';
        document.getElementById('task-priority').value = 'medium';
        document.getElementById('task-status').value = 'todo';
        
        // Clear date field
        document.getElementById('task-due-date').value = '';
    },

    loadTaskData: (taskId) => {
        const tasks = Storage.getTasks();
        const task = tasks.find(t => t.id === taskId);
        
        if (task) {
            document.getElementById('task-id').value = task.id;
            document.getElementById('task-title').value = task.title;
            document.getElementById('task-description').value = task.description || '';
            document.getElementById('task-priority').value = task.priority;
            document.getElementById('task-tags').value = task.tags ? task.tags.join(', ') : '';
            document.getElementById('task-due-date').value = task.dueDate || '';
            document.getElementById('task-status').value = task.status;
        }
    },

    saveTask: () => {
        const taskId = document.getElementById('task-id').value;
        const title = document.getElementById('task-title').value.trim();
        
        if (!title) {
            alert('Task title is required!');
            return;
        }
        
        const tasks = Storage.getTasks();
        let task;
        
        if (taskId) {
            // Update existing task
            const taskIndex = tasks.findIndex(t => t.id === taskId);
            if (taskIndex !== -1) {
                task = tasks[taskIndex];
                task.title = title;
                task.description = document.getElementById('task-description').value;
                task.priority = document.getElementById('task-priority').value;
                task.tags = document.getElementById('task-tags').value
                    .split(',')
                    .map(tag => tag.trim())
                    .filter(tag => tag !== '');
                task.dueDate = document.getElementById('task-due-date').value;
                task.status = document.getElementById('task-status').value;
                task.updatedAt = new Date().toISOString();
            }
        } else {
            // Create new task
            task = {
                id: Storage.generateTaskId(),
                title: title,
                description: document.getElementById('task-description').value,
                priority: document.getElementById('task-priority').value,
                tags: document.getElementById('task-tags').value
                    .split(',')
                    .map(tag => tag.trim())
                    .filter(tag => tag !== ''),
                dueDate: document.getElementById('task-due-date').value,
                status: document.getElementById('task-status').value,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            tasks.push(task);
        }
        
        Storage.saveTasks(tasks);
        App.renderTasks();
        App.updateTaskCounts();
        App.closeTaskModal();
        
        // For the test case output
        if (!taskId) {
            console.log("Task created.");
            console.log("TaskID: " + task.id);
        }
    },

    deleteTask: () => {
        const taskId = document.getElementById('task-id').value;
        
        if (confirm('Are you sure you want to delete this task?')) {
            if (Storage.softDeleteTask(taskId)) {
                App.renderTasks();
                App.updateTaskCounts();
                App.closeTaskModal();
            }
        }
    },

    renderTasks: () => {
        const tasks = Storage.getTasks();
        
        // Filter tasks based on search and priority
        const filteredTasks = tasks.filter(task => {
            const matchesSearch = !App.currentFilter || 
                task.title.toLowerCase().includes(App.currentFilter) ||
                (task.description && task.description.toLowerCase().includes(App.currentFilter)) ||
                (task.tags && task.tags.some(tag => tag.toLowerCase().includes(App.currentFilter)));
                
            const matchesPriority = App.currentPriority === 'all' || task.priority === App.currentPriority;
            
            return matchesSearch && matchesPriority;
        });
        
        // Clear all columns
        const columns = ['todo', 'in-progress', 'done'];
        columns.forEach(status => {
            const column = document.getElementById(`${status}-list`);
            column.innerHTML = '';
            
            // Add empty state if no tasks
            const columnTasks = filteredTasks.filter(task => task.status === status);
            if (columnTasks.length === 0) {
                const emptyState = document.createElement('div');
                emptyState.className = 'empty-state';
                emptyState.innerHTML = `
                    <p>No tasks found</p>
                    <button class="add-to-column-btn" data-column="${status}">+ Add Task</button>
                `;
                column.appendChild(emptyState);
                
                // Re-attach event listener to the new button
                emptyState.querySelector('button').addEventListener('click', () => {
                    App.openTaskModal(null, status);
                });
            }
        });
        
        // Add tasks to their respective columns
        filteredTasks.forEach(task => {
            App.createTaskElement(task);
        });
    },

    createTaskElement: (task) => {
        const taskElement = document.createElement('div');
        taskElement.className = `task-card priority-${task.priority}`;
        taskElement.id = `task-${task.id}`;
        
        // Format due date if exists
        let dueDateHtml = '';
        if (task.dueDate) {
            const dueDate = new Date(task.dueDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const isOverdue = dueDate < today && task.status !== 'done';
            dueDateHtml = `
                <div class="due-date ${isOverdue ? 'overdue' : ''}">
                    <span>📅</span> ${dueDate.toLocaleDateString()}
                </div>
            `;
        }
        
        // Create tags HTML
        let tagsHtml = '';
        if (task.tags && task.tags.length > 0) {
            tagsHtml = `
                <div class="task-tags">
                    ${task.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
            `;
        }
        
        taskElement.innerHTML = `
            <div class="task-header">
                <div class="task-title">${task.title}</div>
                <div class="task-priority priority-${task.priority}">${task.priority}</div>
            </div>
            ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
            ${tagsHtml}
            <div class="task-footer">
                ${dueDateHtml}
                <div class="task-id">${task.id}</div>
            </div>
        `;
        
        // Add click event to edit task
        taskElement.addEventListener('click', (e) => {
            if (!e.target.closest('.task-priority')) {
                App.openTaskModal(task.id);
            }
        });
        
        // Set up drag events for this task
        DragDrop.setupTaskDragEvents(taskElement);
        
        // Add to the appropriate column
        const columnId = `${task.status}-list`;
        const column = document.getElementById(columnId);
        
        // Remove empty state if it exists
        const emptyState = column.querySelector('.empty-state');
        if (emptyState) {
            emptyState.remove();
        }
        
        column.appendChild(taskElement);
    },


    updateTaskCounts: () => {
        const tasks = Storage.getTasks();
        const counts = {
            'todo': 0,
            'in-progress': 0,
            'done': 0
        };
        
        tasks.forEach(task => {
            // eslint-disable-next-line no-prototype-builtins
            if (counts.hasOwnProperty(task.status)) {
                counts[task.status]++;
            }
        });
        
        document.getElementById('todo-count').textContent = counts.todo;
        document.getElementById('in-progress-count').textContent = counts['in-progress'];
        document.getElementById('done-count').textContent = counts.done;
    }
};

// Initialize the app
App.init();