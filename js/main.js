document.addEventListener('DOMContentLoaded', () => {
  Net.init({ onStateUpdate: UI.onState });

  UI.initLobby();
  UI.initRoomScreen();

  // Guide button (floating, works from any screen)
  document.getElementById('btn-guide').addEventListener('click', () => {
    UI.buildGuide();
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
    document.getElementById('modal-guide').classList.remove('hidden');
  });
  document.getElementById('btn-close-guide').addEventListener('click', () => {
    document.getElementById('modal-guide').classList.add('hidden');
  });

  // Close modals by backdrop click — except those that require an action
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', e => {
      const id = modal.id;
      if (e.target === modal && id !== 'modal-merchant' && id !== 'modal-guard'
          && id !== 'modal-target' && id !== 'modal-peek') {
        modal.classList.add('hidden');
      }
    });
  });

  // Show lobby by default
  UI.showScreen('lobby');
});
