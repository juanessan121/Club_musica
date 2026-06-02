const fs = require('fs');
const { mdToPdf } = require('md-to-pdf');

(async () => {
    try {
        const pdf = await mdToPdf({ path: 'Llenado_ADM_TOGAF_Club_Musica.md' }, { dest: 'Llenado_ADM_TOGAF_Club_Musica.pdf' });
        if (pdf) {
            console.log('PDF created successfully.');
        }
    } catch (err) {
        console.error('Error creating PDF:', err);
    }
})();
