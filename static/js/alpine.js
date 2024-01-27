document.addEventListener('alpine:init', () => {
    // TODO Remove loading screen somehow

    Alpine.data('gameState', () => ({
        testing: 'Hello World!'
    }))
})