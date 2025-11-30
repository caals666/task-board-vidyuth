// Drag and drop functionality
const DragDrop = {
    draggedTask: null,
    sourceColumn: null,

    init: () => {
        document.addEventListener('DOMContentLoaded', () => {
            DragDrop.setupEventListeners();
        });
    },

    setupEventListeners: () => {
        // Add drag event listeners to all task cards
        document.addEventListener('dragstart', DragDrop.handleDragStart);
        document.addEventListener('dragend', DragDrop.handleDragEnd);
        
        // Add drop zone event listeners
        const dropZones = document.querySelectorAll('.task-list');
        dropZones.forEach(zone => {
            zone.addEventListener('dragover', DragDrop.handleDragOver);
            zone.addEventListener('dragenter', DragDrop.handleDragEnter);
            zone.addEventListener('dragleave', DragDrop.handleDragLeave);
            zone.addEventListener('drop', DragDrop.handleDrop);
        });
    },

    handleDragStart: (e) => {
        if (e.target.classList.contains('task-card')) {
            DragDrop.draggedTask = e.target;
            DragDrop.sourceColumn = DragDrop.draggedTask.closest('.task-list');
            
            e.dataTransfer.setData('text/plain', e.target.id);
            e.target.classList.add('dragging');
            
            // Add a small delay to make the drag image work better
            setTimeout(() => {
                e.target.style.opacity = '0.4';
            }, 0);
        }
    },

    handleDragEnd: (e) => {
        if (e.target.classList.contains('task-card')) {
            e.target.classList.remove('dragging');
            e.target.style.opacity = '1';
            
            // Remove active class from all drop zones
            document.querySelectorAll('.task-list').forEach(zone => {
                zone.classList.remove('active');
            });
            
            DragDrop.draggedTask = null;
            DragDrop.sourceColumn = null;
        }
    },

    handleDragOver: (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    },

    handleDragEnter: (e) => {
        e.preventDefault();
        if (e.target.classList.contains('task-list')) {
            e.target.classList.add('active');
        } else if (e.target.closest('.task-list')) {
            e.target.closest('.task-list').classList.add('active');
        }
    },

    handleDragLeave: (e) => {
        if (e.target.classList.contains('task-list') && 
            !e.target.contains(e.relatedTarget)) {
            e.target.classList.remove('active');
        }
    },

    handleDrop: (e) => {
        e.preventDefault();
        
        const dropZone = e.target.classList.contains('task-list') 
            ? e.target 
            : e.target.closest('.task-list');
            
        if (!dropZone) return;
        
        dropZone.classList.remove('active');
        
        if (DragDrop.draggedTask && DragDrop.sourceColumn !== dropZone) {
            // Move task to new column
            const taskId = DragDrop.draggedTask.id.replace('task-', '');
            const newStatus = dropZone.getAttribute('data-status');
            
            // Update task status in storage
            const tasks = Storage.getTasks();
            const taskIndex = tasks.findIndex(task => task.id === taskId);
            
            if (taskIndex !== -1) {
                tasks[taskIndex].status = newStatus;
                Storage.saveTasks(tasks);
                
                // Move the task element to the new column
                dropZone.appendChild(DragDrop.draggedTask);
                
                // Update the UI
                // eslint-disable-next-line no-undef
                App.renderTasks();
            }
        }
        
        // Handle reordering within the same column
        if (DragDrop.draggedTask && DragDrop.sourceColumn === dropZone) {
            // Get the mouse position and find the closest task
            const afterElement = DragDrop.getDragAfterElement(dropZone, e.clientY);
            
            if (afterElement) {
                dropZone.insertBefore(DragDrop.draggedTask, afterElement);
            } else {
                dropZone.appendChild(DragDrop.draggedTask);
            }
            
            // Save the new order
            DragDrop.saveColumnOrder(dropZone);
        }
    },

    getDragAfterElement: (container, y) => {
        const draggableElements = [...container.querySelectorAll('.task-card:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    },

    saveColumnOrder: (column) => {
        const status = column.getAttribute('data-status');
        const taskElements = column.querySelectorAll('.task-card');
        const taskOrder = Array.from(taskElements).map(el => el.id.replace('task-', ''));
        
        const tasks = Storage.getTasks();
        
        // Update the order of tasks in the same status
        const statusTasks = tasks.filter(task => task.status === status);
        
        // Reorder based on DOM order
        const orderedTasks = [];
        taskOrder.forEach(taskId => {
            const task = statusTasks.find(t => t.id === taskId);
            if (task) orderedTasks.push(task);
        });
        
        // Add any tasks that are in this status but not in the DOM (shouldn't happen)
        statusTasks.forEach(task => {
            if (!orderedTasks.find(t => t.id === task.id)) {
                orderedTasks.push(task);
            }
        });
        
        // Update the tasks array with the new order
        const otherTasks = tasks.filter(task => task.status !== status);
        const updatedTasks = [...otherTasks, ...orderedTasks];
        
        Storage.saveTasks(updatedTasks);
    }
};