document.querySelectorAll('.flip-card').forEach(function(card){
      function toggle(){ card.classList.toggle('is-flipped'); }
      card.addEventListener('click', toggle);
      card.addEventListener('keydown', function(e){
        if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      });
    });