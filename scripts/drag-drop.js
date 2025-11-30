// Drag and drop functionality
const DragDrop = {
    draggedTask: null,
    sourceColumn: null,
    dragImage: null,

    init: () => {
        document.addEventListener('DOMContentLoaded', () => {
            DragDrop.setupEventListeners();
        });
    },

    setupEventListeners: () => {
        // Add drag event listeners to all task cards
        document.addEventListener('dragstart', DragDrop.handleDragStart);
        document.addEventListener('dragend', DragDrop.handleDragEnd);
        
        // Add drop zone event listeners to all task lists
        const dropZones = document.querySelectorAll('.task-list');
        dropZones.forEach(zone => {
            zone.addEventListener('dragover', DragDrop.handleDragOver);
            zone.addEventListener('dragenter', DragDrop.handleDragEnter);
            zone.addEventListener('dragleave', DragDrop.handleDragLeave);
            zone.addEventListener('drop', DragDrop.handleDrop);
        });

        // Create drag image
        DragDrop.dragImage = document.createElement('div');
        DragDrop.dragImage.style.background = 'rgba(0, 121, 191, 0.1)';
        DragDrop.dragImage.style.border = '2px dashed #0079bf';
        DragDrop.dragImage.style.borderRadius = '8px';
        DragDrop.dragImage.style.padding = '10px';
        DragDrop.dragImage.style.color = '#0079bf';
        DragDrop.dragImage.style.fontSize = '14px';
        DragDrop.dragImage.style.position = 'absolute';
        DragDrop.dragImage.style.top = '-1000px';
        document.body.appendChild(DragDrop.dragImage);
    },

    handleDragStart: (e) => {
        if (e.target.classList.contains('task-card')) {
            DragDrop.draggedTask = e.target;
            DragDrop.sourceColumn = DragDrop.draggedTask.closest('.task-list');
            
            // Set drag image
            DragDrop.dragImage.textContent = `Moving: ${e.target.querySelector('.task-title').textContent}`;
            e.dataTransfer.setDragImage(DragDrop.dragImage, 0, 0);
            
            e.dataTransfer.setData('text/plain', e.target.id);
            e.dataTransfer.effectAllowed = 'move';
            
            e.target.classList.add('dragging');
            
            // Add active class to all drop zones
            document.querySelectorAll('.task-list').forEach(zone => {
                zone.classList.add('drop-zone');
            });
        }
    },

    handleDragEnd: (e) => {
        if (e.target.classList.contains('task-card')) {
            e.target.classList.remove('dragging');
            
            // Remove active class from all drop zones
            document.querySelectorAll('.task-list').forEach(zone => {
                zone.classList.remove('active', 'drop-zone');
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
        const dropZone = e.target.classList.contains('task-list') 
            ? e.target 
            : e.target.closest('.task-list');
            
        if (dropZone) {
            dropZone.classList.add('active');
        }
    },

    handleDragLeave: (e) => {
        const dropZone = e.target.classList.contains('task-list') 
            ? e.target 
            : e.target.closest('.task-list');
            
        if (dropZone && !dropZone.contains(e.relatedTarget)) {
            dropZone.classList.remove('active');
        }
    },

    handleDrop: (e) => {
        e.preventDefault();
        
        const dropZone = e.target.classList.contains('task-list') 
            ? e.target 
            : e.target.closest('.task-list');
            
        if (!dropZone) return;
        
        dropZone.classList.remove('active');
        
        if (DragDrop.draggedTask) {
            const taskId = DragDrop.draggedTask.id.replace('task-', '');
            const newStatus = dropZone.getAttribute('data-status');
            
            // Update task status in storage
            const tasks = Storage.getTasks();
            const taskIndex = tasks.findIndex(task => task.id === taskId);
            
            if (taskIndex !== -1) {
                tasks[taskIndex].status = newStatus;
                tasks[taskIndex].updatedAt = new Date().toISOString();
                Storage.saveTasks(tasks);
                
                // Move the task element to the new column
                if (DragDrop.sourceColumn !== dropZone) {
                    dropZone.appendChild(DragDrop.draggedTask);
                    
                    // Update task counts
                    // eslint-disable-next-line no-undef
                    App.updateTaskCounts();
                    
                    // Show success feedback
                    DragDrop.showDropFeedback(`Task moved to ${newStatus.replace('-', ' ')}`);
                }
                
                // Handle reordering within the same column
                if (DragDrop.sourceColumn === dropZone) {
                    const afterElement = DragDrop.getDragAfterElement(dropZone, e.clientY);
                    
                    if (afterElement) {
                        dropZone.insertBefore(DragDrop.draggedTask, afterElement);
                    } else {
                        dropZone.appendChild(DragDrop.draggedTask);
                    }
                    
                    // Save the new order
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
    },

    showDropFeedback: (message) => {
        // Create feedback element
        const feedback = document.createElement('div');
        feedback.textContent = message;
        feedback.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: var(--success-color);
            color: white;
            padding: 0.75rem 1.5rem;
            border-radius: var(--border-radius);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(feedback);
        
        // Remove after 2 seconds
        setTimeout(() => {
            feedback.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (feedback.parentNode) {
                    feedback.parentNode.removeChild(feedback);
                }
            }, 300);
        }, 2000);
    }
};

// Add CSS for feedback animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
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
document.head.appendChild(style);