// Drag and drop functionality using HTML5 Drag and Drop API
const DragDrop = {
    draggedTask: null,
    sourceColumn: null,

    init: () => {
        document.addEventListener('DOMContentLoaded', () => {
            DragDrop.setupEventListeners();
        });
    },

    setupEventListeners: () => {
        // We'll set up drag events when tasks are rendered
        // This will be called from App.js after tasks are created
    },

    // Set up drag events for a task element
    setupTaskDragEvents: (taskElement) => {
        taskElement.setAttribute('draggable', 'true');
        
        taskElement.addEventListener('dragstart', DragDrop.handleDragStart);
        taskElement.addEventListener('dragend', DragDrop.handleDragEnd);
    },

    // Set up drop events for columns
    setupColumnDropEvents: () => {
        const columns = document.querySelectorAll('.task-list');
        columns.forEach(column => {
            column.addEventListener('dragover', DragDrop.handleDragOver);
            column.addEventListener('dragenter', DragDrop.handleDragEnter);
            column.addEventListener('dragleave', DragDrop.handleDragLeave);
            column.addEventListener('drop', DragDrop.handleDrop);
        });
    },

    handleDragStart: (e) => {
        DragDrop.draggedTask = e.target;
        DragDrop.sourceColumn = e.target.closest('.task-list');
        
        // Add visual feedback
        e.target.classList.add('dragging');
        
        // Set drag image and data
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', e.target.id);
        
        // Set drag image to be the element itself
        setTimeout(() => {
            e.target.style.opacity = '0.4';
        }, 0);
    },

    handleDragEnd: (e) => {
        // Remove visual feedback
        e.target.classList.remove('dragging');
        e.target.style.opacity = '1';
        
        // Remove drop zone highlights
        document.querySelectorAll('.task-list').forEach(column => {
            column.classList.remove('drag-over');
        });
        
        DragDrop.draggedTask = null;
        DragDrop.sourceColumn = null;
    },

    handleDragOver: (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    },

    handleDragEnter: (e) => {
        e.preventDefault();
        const dropZone = e.target.closest('.task-list');
        if (dropZone) {
            dropZone.classList.add('drag-over');
        }
    },

    handleDragLeave: (e) => {
        const dropZone = e.target.closest('.task-list');
        if (dropZone && !dropZone.contains(e.relatedTarget)) {
            dropZone.classList.remove('drag-over');
        }
    },

    handleDrop: (e) => {
        e.preventDefault();
        
        const dropZone = e.target.closest('.task-list');
        if (!dropZone) return;
        
        dropZone.classList.remove('drag-over');
        
        const taskId = e.dataTransfer.getData('text/plain').replace('task-', '');
        const taskElement = document.getElementById(`task-${taskId}`);
        
        if (taskElement) {
            const newStatus = dropZone.getAttribute('data-status');
            
            // Update task in storage
            const tasks = Storage.getTasks();
            const taskIndex = tasks.findIndex(task => task.id === taskId);
            
            if (taskIndex !== -1) {
                const oldStatus = tasks[taskIndex].status;
                
                // Only update if status changed
                if (oldStatus !== newStatus) {
                    tasks[taskIndex].status = newStatus;
                    tasks[taskIndex].updatedAt = new Date().toISOString();
                    Storage.saveTasks(tasks);
                    
                    // Move task element to new column
                    dropZone.appendChild(taskElement);
                    
                    // Update task counts
                    // eslint-disable-next-line no-undef
                    App.updateTaskCounts();
                    
                    // Show feedback
                    DragDrop.showSuccessMessage(`Task moved to ${newStatus.replace('-', ' ')}`);
                } else {
                    // Reorder within same column
                    const afterElement = DragDrop.getDragAfterElement(dropZone, e.clientY);
                    if (afterElement) {
                        dropZone.insertBefore(taskElement, afterElement);
                    } else {
                        dropZone.appendChild(taskElement);
                    }
                    
                    // Save new order
                    DragDrop.saveColumnOrder(dropZone);
                }
            }
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
        
        // Update order for tasks in this status
        const statusTasks = tasks.filter(task => task.status === status);
        const orderedTasks = [];
        
        taskOrder.forEach(taskId => {
            const task = statusTasks.find(t => t.id === taskId);
            if (task) orderedTasks.push(task);
        });
        
        // Combine with tasks from other statuses
        const otherTasks = tasks.filter(task => task.status !== status);
        const updatedTasks = [...otherTasks, ...orderedTasks];
        
        Storage.saveTasks(updatedTasks);
    },

    showSuccessMessage: (message) => {
        // Remove existing messages
        const existingMessage = document.querySelector('.drop-feedback');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        // Create feedback element
        const feedback = document.createElement('div');
        feedback.className = 'drop-feedback';
        feedback.textContent = message;
        feedback.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: var(--success-color);
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 1000;
            font-weight: 500;
            animation: slideInRight 0.3s ease-out;
        `;
        
        document.body.appendChild(feedback);
        
        // Remove after 2 seconds
        setTimeout(() => {
            feedback.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                if (feedback.parentNode) {
                    feedback.parentNode.removeChild(feedback);
                }
            }, 300);
        }, 2000);
    }
};

// Add CSS animations for drag and drop
const dragDropStyles = `
    .task-card.dragging {
        transform: rotate(5deg);
        opacity: 0.6;
    }
    
    .task-list.drag-over {
        background-color: rgba(0, 121, 191, 0.1);
        border: 2px dashed #0079bf;
    }
    
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;

// Inject styles
const styleSheet = document.createElement('style');
styleSheet.textContent = dragDropStyles;
document.head.appendChild(styleSheet);