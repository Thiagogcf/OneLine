document.addEventListener('DOMContentLoaded', () => {
    const nextStepBtn = document.getElementById('next-step-btn');
    const addSignalBtn = document.getElementById('add-signal-btn');
    const plotsContainer = document.getElementById('plots-container');
    const description = document.getElementById('description');
    const controlsContainer = document.getElementById('signal-controls-container');

    // --- Elementos de Controle ---
    let signalControls = []; // Array para armazenar os controles de cada senoide
    let cutoffSlider; // Declarado no escopo superior
    let noiseSlider; // Controle para a intensidade do ruído
    let noiseUpdateListener = null; // Referência para o listener de evento do ruído

    // Parâmetros do Sinal
    const Fs = 1000; // Frequência de amostragem
    const T = 1 / Fs; // Período de amostragem
    const L = 1000; // Comprimento do sinal
    const t = Array.from({ length: L }, (_, i) => i * T); // Vetor de tempo

    // Sinais (serão definidos dinamicamente)
    let signals = [];
    let combinedSignal, noisySignal, fftData, frequencies, filteredFftData, filteredSignal;

    let currentStep = 0;

    // Fila de Funções (Passos)
    const steps = [
        generateAndShowInitialSignals,
        combineAndShowSignal,
        addAndShowNoise,
        applyAndShowFFT,
        applyAndShowLowPassFilter,
        showFilteredSignal,
        identifyAndShowPeaks,
    ];

    // --- Gerenciamento Dinâmico de Controles ---
    function addSignalControl(freq = 20, amp = 0.8) {
        const signalId = signalControls.length + 1;
        const controlDiv = document.createElement('div');
        controlDiv.className = 'signal-control';
        controlDiv.dataset.id = signalId;

        controlDiv.innerHTML = `
            <button class="remove-btn" title="Remover Sinal">-</button>
            <h3>Senoide ${signalId}</h3>
            <label for="freq${signalId}">Frequência: <span id="freq${signalId}-val">${freq} Hz</span></label>
            <input type="range" id="freq${signalId}" min="1" max="200" value="${freq}">
            <label for="amp${signalId}">Amplitude: <span id="amp${signalId}-val">${amp.toFixed(1)}</span></label>
            <input type="range" id="amp${signalId}" min="0.1" max="2" step="0.1" value="${amp}">
        `;
        controlsContainer.appendChild(controlDiv);

        const newControl = {
            id: signalId,
            freqSlider: document.getElementById(`freq${signalId}`),
            ampSlider: document.getElementById(`amp${signalId}`),
            freqVal: document.getElementById(`freq${signalId}-val`),
            ampVal: document.getElementById(`amp${signalId}-val`),
            div: controlDiv
        };

        newControl.freqSlider.addEventListener('input', (e) => {
            newControl.freqVal.textContent = `${e.target.value} Hz`;
            resetSimulation();
        });
        newControl.ampSlider.addEventListener('input', (e) => {
            newControl.ampVal.textContent = parseFloat(e.target.value).toFixed(1);
            resetSimulation();
        });
        
        controlDiv.querySelector('.remove-btn').addEventListener('click', () => {
            removeSignalControl(signalId);
        });

        signalControls.push(newControl);
        updateRemoveButtons();
        resetSimulation();
    }

    function removeSignalControl(idToRemove) {
        const controlToRemove = signalControls.find(c => c.id === idToRemove);
        if (controlToRemove) {
            controlToRemove.div.remove();
            signalControls = signalControls.filter(c => c.id !== idToRemove);
            updateRemoveButtons();
            resetSimulation();
        }
    }

    function updateRemoveButtons() {
        // Desabilita o botão de remover se houver apenas um sinal
        const removeButtons = controlsContainer.querySelectorAll('.remove-btn');
        if (signalControls.length <= 1) {
            removeButtons.forEach(btn => btn.style.display = 'none');
        } else {
            removeButtons.forEach(btn => btn.style.display = 'block');
        }
    }
    
    addSignalBtn.addEventListener('click', () => addSignalControl());

    function resetSimulation() {
        currentStep = 0;
        plotsContainer.innerHTML = '';
        nextStepBtn.disabled = false;
        nextStepBtn.textContent = 'Próximo Passo';
        addSignalBtn.disabled = false;
        
        // Remove o listener se ele existir de uma simulação anterior
        if (noiseSlider && noiseUpdateListener) {
            noiseSlider.removeEventListener('input', noiseUpdateListener);
            noiseUpdateListener = null;
        }
        noiseSlider = null; // Garante que o slider será recriado

        updateDescription('<p>Ajuste os parâmetros das senoides acima e clique em "Próximo Passo" para iniciar a demonstração.</p>');
    }

    nextStepBtn.addEventListener('click', () => {
        if (currentStep < steps.length) {
            steps[currentStep]();
            currentStep++;

            // Adiciona um pequeno delay para garantir que o DOM foi atualizado antes de rolar
            setTimeout(() => {
                window.scrollTo({
                    top: document.body.scrollHeight,
                    behavior: 'smooth'
                });
            }, 100);
        }
        if (currentStep >= steps.length) {
            nextStepBtn.textContent = 'Fim da Demonstração';
            nextStepBtn.disabled = true;
            addSignalBtn.disabled = true;
        }
    });

    // --- Configuração do Tema do Plotly ---
    function getPlotlyTheme() {
        const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (isDarkMode) {
            return {
                paper_bgcolor: 'rgba(0,0,0,0)',
                plot_bgcolor: 'rgba(0,0,0,0)',
                font: { color: '#e0e0e0' },
                xaxis: { 
                    gridcolor: '#444', 
                    zerolinecolor: '#666'
                },
                yaxis: { 
                    gridcolor: '#444', 
                    zerolinecolor: '#666'
                }
            };
        }
        // Tema Claro (Padrão)
        return {
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            font: { color: '#333' },
            xaxis: { 
                gridcolor: '#eee',
                zerolinecolor: '#ccc'
            },
            yaxis: { 
                gridcolor: '#eee',
                zerolinecolor: '#ccc'
             }
        };
    }

    function createPlot(divId, data, layout) {
        const plotDiv = document.createElement('div');
        plotDiv.id = divId;
        plotDiv.className = 'plot';
        plotsContainer.appendChild(plotDiv);

        const themeLayout = getPlotlyTheme();
        const finalLayout = { ...themeLayout, ...layout };
        
        Plotly.newPlot(divId, data, finalLayout);
        return plotDiv;
    }

    function updateDescription(htmlContent) {
        description.innerHTML = htmlContent;
    }

    // --- Funções Auxiliares de FFT ---
    // Uma implementação simples de DFT/FFT para este exemplo
    function fft(signal) {
        const N = signal.length;
        const X = new Array(N).fill(0).map(() => [0, 0]); // Array de números complexos

        for (let k = 0; k < N; k++) {
            for (let n = 0; n < N; n++) {
                const angle = (2 * Math.PI * k * n) / N;
                X[k][0] += signal[n] * Math.cos(angle); // Parte Real
                X[k][1] -= signal[n] * Math.sin(angle); // Parte Imaginária
            }
        }
        return X;
    }

    // --- Passo 1: Gerar e Mostrar Senoides Iniciais ---
    function generateAndShowInitialSignals() {
        signals = []; // Limpa os sinais antigos
        plotsContainer.innerHTML = ''; // Limpa plots antigos para este passo
        let descriptionHTML = '<p><strong>Passo 1: Geração de Sinais</strong></p><p>Começamos com as seguintes senoides puras:</p><ul>';

        signalControls.forEach(control => {
            const f = parseFloat(control.freqSlider.value);
            const amp = parseFloat(control.ampSlider.value);
            const signal = t.map(time => amp * Math.sin(2 * Math.PI * f * time));
            signals.push(signal);
            
            const layout = { title: `Senoide ${control.id}: ${f} Hz, Amplitude ${amp.toFixed(1)}` };
            createPlot(`plot${control.id}`, [{ x: t, y: signal, type: 'scatter', name: `Senoide ${control.id}` }], layout);
            
            descriptionHTML += `<li>Senoide ${control.id}: Frequência ${f} Hz, Amplitude ${amp.toFixed(1)}</li>`;
        });

        descriptionHTML += '</ul>';
        updateDescription(descriptionHTML);
    }

    // --- Passo 2: Combinar Sinais ---
    function combineAndShowSignal() {
        combinedSignal = new Array(L).fill(0);
        for (const signal of signals) {
            for (let i = 0; i < L; i++) {
                combinedSignal[i] += signal[i];
            }
        }

        const layout = { title: 'Sinais Combinados' };
        createPlot('plot-combined', [{ x: t, y: combinedSignal, type: 'scatter' }], layout);

        updateDescription(`
            <p><strong>Passo 2: Soma dos Sinais</strong></p>
            <p>Todas as senoides são somadas para criar um sinal mais complexo. Observe como a forma de onda resultante contém características de todos os sinais originais.</p>
        `);
    }

    // --- Passo 3: Adicionar Ruído ---
    function addAndShowNoise() {
        let plotDiv = document.getElementById('plot-noisy');
        if (!plotDiv) {
            plotDiv = createPlot('plot-noisy', [{ x: t, y: [] }], { title: 'Sinal Combinado com Ruído' });
            
            // Cria o controle de ruído e o insere logo após o gráfico de ruído
            const noiseControlDiv = document.createElement('div');
            noiseControlDiv.className = 'noise-control';
            noiseControlDiv.innerHTML = `
                <h3>Controle de Ruído</h3>
                <label for="noise-slider">Intensidade do Ruído: <span id="noise-val">0.5</span></label>
                <input type="range" id="noise-slider" min="0" max="2" step="0.1" value="0.5">
            `;
            plotDiv.insertAdjacentElement('afterend', noiseControlDiv);
            noiseSlider = document.getElementById('noise-slider');
        }

        const noiseVal = document.getElementById('noise-val');

        // Define a função de atualização em tempo real
        noiseUpdateListener = () => {
            const noiseIntensity = parseFloat(noiseSlider.value);
            noiseVal.textContent = noiseIntensity.toFixed(1);
            
            const noise = t.map(() => (Math.random() - 0.5) * noiseIntensity * 2);
            noisySignal = combinedSignal.map((sample, i) => sample + noise[i]);

            const themeLayout = getPlotlyTheme();
            const finalLayout = { ...themeLayout, title: 'Sinal Combinado com Ruído' };

            Plotly.react(plotDiv, [{ x: t, y: noisySignal, type: 'scatter' }], finalLayout);

            updateDescription(`
                <p><strong>Passo 3: Adição de Ruído</strong></p>
                <p>Adicionamos ruído aleatório para simular condições do mundo real. <strong>Ajuste o controle para ver o efeito em tempo real.</strong></p>
                <p>Intensidade do ruído ajustada para: <strong>${noiseIntensity.toFixed(1)}</strong>.</p>
            `);
        };

        noiseSlider.addEventListener('input', noiseUpdateListener);
        noiseUpdateListener(); // Chama uma vez para o estado inicial
    }

    // --- Passo 4: Aplicar e Mostrar FFT ---
    function applyAndShowFFT() {
        // Desabilita o controle de ruído ao avançar
        if (noiseSlider) {
            noiseSlider.disabled = true;
        }

        const currentFreqs = signalControls.map(c => `${parseFloat(c.freqSlider.value)} Hz`);
        
        const N = noisySignal.length;
        fftData = fft(noisySignal);

        const magnitude = fftData.map(c => Math.sqrt(c[0] * c[0] + c[1] * c[1]) / N);
        const P1 = magnitude.slice(0, N / 2 + 1);
        P1.forEach((val, i) => P1[i] = i > 0 && i < P1.length - 1 ? 2 * val : val);

        frequencies = Array.from({ length: N / 2 + 1 }, (_, i) => (Fs * i) / N);

        const layout = {
            title: 'Transformada de Fourier (FFT) do Sinal Ruidoso',
            xaxis: { title: 'Frequência (Hz)' },
            yaxis: { title: 'Magnitude' }
        };
        createPlot('plot-fft', [{ x: frequencies, y: P1, type: 'scatter' }], layout);

        updateDescription(`
            <p><strong>Passo 4: Transformada de Fourier (FFT)</strong></p>
            <p>Aplicamos a Transformada de Fourier para converter o sinal do domínio do tempo para o domínio da frequência. Isso nos permite ver quais frequências compõem o sinal. Os picos devem corresponder às frequências originais (${currentFreqs.join(', ')}), mas o ruído adiciona componentes em várias outras frequências.</p>
        `);
    }

    // --- Passo 5: Filtro Passa-Baixa ---
    function applyAndShowLowPassFilter() {
        const sliderContainer = document.createElement('div');
        sliderContainer.className = 'slider-container';
        sliderContainer.innerHTML = `
            <label for="cutoff-slider">Magnitude de Corte:</label>
            <input type="range" id="cutoff-slider" min="0" max="1.1" step="0.01" value="0.3">
            <span id="cutoff-value">0.30</span>
        `;
        plotsContainer.appendChild(sliderContainer);

        cutoffSlider = document.getElementById('cutoff-slider'); // Atribui à variável de escopo superior
        const cutoffValueSpan = document.getElementById('cutoff-value');

        function updateFilter() {
            const cutoffMagnitude = parseFloat(cutoffSlider.value);
            cutoffValueSpan.textContent = `${cutoffMagnitude.toFixed(2)}`;
            const N = noisySignal.length;

            filteredFftData = fftData.map((val, i) => {
                // Calcula a magnitude normalizada e escalada, equivalente ao que é mostrado no gráfico P1
                const raw_magnitude = Math.sqrt(val[0]**2 + val[1]**2) / N;
                const p1_magnitude = (i > 0 && i < N/2) ? 2 * raw_magnitude : raw_magnitude;
                
                // Filtro passa-alta na MAGNITUDE: mantém componentes com magnitude ACIMA do corte.
                return p1_magnitude < cutoffMagnitude ? [0, 0] : val;
            });
            
            const magnitude_filtered = filteredFftData.map(c => Math.sqrt(c[0] * c[0] + c[1] * c[1]) / N);
            const P1_filtered = magnitude_filtered.slice(0, N / 2 + 1);
            P1_filtered.forEach((val, i) => P1_filtered[i] = i > 0 && i < P1_filtered.length - 1 ? 2 * val : val);

            const themeLayout = getPlotlyTheme();
            const finalLayout = {
                ...themeLayout,
                title: 'FFT Após Filtro por Magnitude',
                xaxis: { title: 'Frequência (Hz)' },
                yaxis: { title: 'Magnitude' },
                shapes: [{
                    type: 'line',
                    x0: 0,
                    y0: cutoffMagnitude,
                    x1: Fs / 2,
                    y1: cutoffMagnitude,
                    line: {
                        color: 'red',
                        width: 2,
                        dash: 'dash'
                    },
                    name: 'Corte'
                }]
            };
            
            let plotDiv = document.getElementById('plot-fft-filtered');
            if (!plotDiv) {
                plotDiv = createPlot('plot-fft-filtered', [{ x: frequencies, y: P1_filtered, type: 'scatter' }], finalLayout);
            } else {
                Plotly.react(plotDiv, [{ x: frequencies, y: P1_filtered, type: 'scatter' }], finalLayout);
            }
        }
        
        cutoffSlider.addEventListener('input', updateFilter);
        updateFilter(); // Chamada inicial

        updateDescription(`
            <p><strong>Passo 5: Filtragem por Magnitude (Limiar)</strong></p>
            <p>Agora, aplicamos um filtro que remove os componentes do sinal com base em sua <strong>magnitude</strong>. Isso funciona como um limiar (threshold) ou "filtro passa-alta de magnitude". Componentes com magnitude abaixo do corte são removidos.</p><p>Use o controle deslizante para ajustar o limiar de magnitude e observe como o ruído (que tem baixa magnitude) é eliminado, enquanto os picos dos sinais originais são mantidos.</p>
        `);
    }

    // --- Funções Auxiliares de IFFT ---
    function ifft(X) {
        const N = X.length;
        const signal = new Array(N).fill(0);

        for (let n = 0; n < N; n++) {
            for (let k = 0; k < N; k++) {
                const angle = (2 * Math.PI * k * n) / N;
                signal[n] += X[k][0] * Math.cos(angle) - X[k][1] * Math.sin(angle);
            }
            signal[n] /= N;
        }
        return signal;
    }

    // --- Passo 6: Mostrar Sinal Filtrado ---
    function showFilteredSignal() {
        // Usa o estado final do filtro do passo anterior. A variável `filteredFftData` já foi atualizada.
        
        filteredSignal = ifft(filteredFftData);

        const layout = { title: 'Sinal Reconstruído (Após Filtro por Magnitude)' };
        createPlot('plot-filtered-signal', [{ x: t, y: filteredSignal, type: 'scatter' }], layout);
        
        // Desativa o slider para fixar o resultado
        if (cutoffSlider) {
            cutoffSlider.disabled = true;
        }
        addSignalBtn.disabled = true; // Desabilita adicionar mais sinais

        updateDescription(`
            <p><strong>Passo 6: Reconstrução do Sinal</strong></p>
            <p>Aplicamos a Transformada Inversa de Fourier (IFFT) no espectro filtrado por magnitude. O resultado é um sinal muito mais limpo, pois os componentes de baixa amplitude (ruído) foram removidos.</p>
        `);
    }

    // --- Passo 7: Identificar Picos ---
    function identifyAndShowPeaks() {
        const originalFreqs = signalControls.map(c => `${parseFloat(c.freqSlider.value)} Hz`);

        // Usa os dados da FFT JÁ FILTRADA do passo anterior
        const N = noisySignal.length;
        const magnitude = filteredFftData.map(c => Math.sqrt(c[0] * c[0] + c[1] * c[1]) / N);
        const P1_filtered = magnitude.slice(0, N / 2 + 1);
        P1_filtered.forEach((val, i) => P1_filtered[i] = i > 0 && i < P1_filtered.length - 1 ? 2 * val : val);
        
        // Algoritmo simples de detecção de picos no sinal filtrado
        const peaks = [];
        const peakFrequencies = [];
        const threshold = 0.1; // Limiar de magnitude para ser considerado um pico

        for (let i = 1; i < P1_filtered.length - 1; i++) {
            if (P1_filtered[i] > P1_filtered[i - 1] && P1_filtered[i] > P1_filtered[i + 1] && P1_filtered[i] > threshold) {
                peaks.push({ x: frequencies[i], y: P1_filtered[i] });
                peakFrequencies.push(frequencies[i].toFixed(1));
            }
        }
        
        const traceLine = {
            x: frequencies,
            y: P1_filtered,
            type: 'scatter',
            name: 'Espectro Filtrado'
        };

        const tracePeaks = {
            x: peaks.map(p => p.x),
            y: peaks.map(p => p.y),
            mode: 'markers',
            marker: { color: 'red', size: 10, symbol: 'x' },
            name: 'Picos Identificados'
        };

        const layout = {
            title: 'Espectro Final com Picos Identificados',
            xaxis: { title: 'Frequência (Hz)' },
            yaxis: { title: 'Magnitude' }
        };

        // Cria um novo gráfico com o espectro filtrado e os picos
        createPlot('plot-final-peaks', [traceLine, tracePeaks], layout);

        updateDescription(`
            <p><strong>Passo 7: Identificação de Frequências</strong></p>
            <p>Finalmente, analisamos o espectro do sinal <strong>filtrado</strong>. Os picos de magnitude são claramente visíveis, e o ruído foi removido. Os picos identificados foram em <strong>${peakFrequencies.join(' Hz e ')} Hz</strong>, correspondendo aproximadamente às frequências originais (${originalFreqs.join(' Hz, ')}).</p>
            <p><strong>Demonstração Concluída!</strong></p>
        `);
    }
    
    // --- Atualização Dinâmica do Tema ---
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        // Encontra todos os gráficos e atualiza o layout
        const allPlots = plotsContainer.querySelectorAll('.plot');
        allPlots.forEach(plotDiv => {
            if (plotDiv.id) {
                const themeLayout = getPlotlyTheme();
                Plotly.relayout(plotDiv.id, themeLayout);
            }
        });
    });


    // Inicialização
    addSignalControl(5, 1.0); // Adiciona o primeiro sinal
    addSignalControl(50, 0.5); // Adiciona o segundo sinal
    resetSimulation();
}); 