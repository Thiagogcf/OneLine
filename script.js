document.addEventListener('DOMContentLoaded', () => {
    const nextStepBtn = document.getElementById('next-step-btn');
    const plotsContainer = document.getElementById('plots-container');
    const description = document.getElementById('description');
    const controlsContainer = document.getElementById('signal-controls-container');

    // --- Elementos de Controle ---
    let freq1Slider, amp1Slider, freq2Slider, amp2Slider;
    let cutoffSlider; // Declarado no escopo superior

    // Parâmetros do Sinal
    const Fs = 1000; // Frequência de amostragem
    const T = 1 / Fs; // Período de amostragem
    const L = 1000; // Comprimento do sinal
    const t = Array.from({ length: L }, (_, i) => i * T); // Vetor de tempo

    // Sinais (serão definidos dinamicamente)
    let signal1, signal2, combinedSignal, noisySignal, fftData, frequencies, filteredFftData, filteredSignal;

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

    function setupControls() {
        controlsContainer.innerHTML = `
            <div class="signal-control">
                <h3>Senoide 1</h3>
                <label for="freq1">Frequência: <span id="freq1-val">5 Hz</span></label>
                <input type="range" id="freq1" min="1" max="100" value="5">
                <label for="amp1">Amplitude: <span id="amp1-val">1.0</span></label>
                <input type="range" id="amp1" min="0.1" max="2" step="0.1" value="1.0">
            </div>
            <div class="signal-control">
                <h3>Senoide 2</h3>
                <label for="freq2">Frequência: <span id="freq2-val">50 Hz</span></label>
                <input type="range" id="freq2" min="1" max="200" value="50">
                <label for="amp2">Amplitude: <span id="amp2-val">0.5</span></label>
                <input type="range" id="amp2" min="0.1" max="2" step="0.1" value="0.5">
            </div>
        `;

        freq1Slider = document.getElementById('freq1');
        amp1Slider = document.getElementById('amp1');
        freq2Slider = document.getElementById('freq2');
        amp2Slider = document.getElementById('amp2');

        const freq1Val = document.getElementById('freq1-val');
        const amp1Val = document.getElementById('amp1-val');
        const freq2Val = document.getElementById('freq2-val');
        const amp2Val = document.getElementById('amp2-val');

        freq1Slider.addEventListener('input', (e) => {
            freq1Val.textContent = `${e.target.value} Hz`;
            resetSimulation();
        });
        amp1Slider.addEventListener('input', (e) => {
            amp1Val.textContent = parseFloat(e.target.value).toFixed(1);
            resetSimulation();
        });
        freq2Slider.addEventListener('input', (e) => {
            freq2Val.textContent = `${e.target.value} Hz`;
            resetSimulation();
        });
        amp2Slider.addEventListener('input', (e) => {
            amp2Val.textContent = parseFloat(e.target.value).toFixed(1);
            resetSimulation();
        });
    }

    function resetSimulation() {
        currentStep = 0;
        plotsContainer.innerHTML = '';
        nextStepBtn.disabled = false;
        nextStepBtn.textContent = 'Próximo Passo';
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
        }
    });

    function createPlot(divId, data, layout) {
        const plotDiv = document.createElement('div');
        plotDiv.id = divId;
        plotDiv.className = 'plot';
        plotsContainer.appendChild(plotDiv);
        Plotly.newPlot(divId, data, layout);
        return plotDiv;
    }

    function updateDescription(htmlContent) {
        description.innerHTML = htmlContent;
    }

    // --- Passo 1: Gerar e Mostrar Senoides Iniciais ---
    function generateAndShowInitialSignals() {
        const f1 = parseFloat(freq1Slider.value);
        const amp1 = parseFloat(amp1Slider.value);
        const f2 = parseFloat(freq2Slider.value);
        const amp2 = parseFloat(amp2Slider.value);

        signal1 = t.map(time => amp1 * Math.sin(2 * Math.PI * f1 * time));
        signal2 = t.map(time => amp2 * Math.sin(2 * Math.PI * f2 * time));

        const layout1 = { title: `Senoide 1: ${f1} Hz, Amplitude ${amp1.toFixed(1)}` };
        const layout2 = { title: `Senoide 2: ${f2} Hz, Amplitude ${amp2.toFixed(1)}` };

        createPlot('plot1', [{ x: t, y: signal1, type: 'scatter', name: 'Senoide 1' }], layout1);
        createPlot('plot2', [{ x: t, y: signal2, type: 'scatter', name: 'Senoide 2' }], layout2);

        updateDescription(`
            <p><strong>Passo 1: Geração de Sinais</strong></p>
            <p>Começamos com duas senoides puras com os parâmetros que você definiu:</p>
            <ul>
                <li>Senoide 1: Frequência ${f1} Hz, Amplitude ${amp1.toFixed(1)}</li>
                <li>Senoide 2: Frequência ${f2} Hz, Amplitude ${amp2.toFixed(1)}</li>
            </ul>
        `);
    }

    // --- Passo 2: Combinar Sinais ---
    function combineAndShowSignal() {
        combinedSignal = t.map((_, i) => signal1[i] + signal2[i]);

        const layout = { title: 'Sinais Combinados' };
        createPlot('plot-combined', [{ x: t, y: combinedSignal, type: 'scatter' }], layout);

        updateDescription(`
            <p><strong>Passo 2: Soma dos Sinais</strong></p>
            <p>As duas senoides são somadas para criar um sinal mais complexo. Observe como a forma de onda resultante contém características de ambos os sinais originais.</p>
        `);
    }

    // --- Passo 3: Adicionar Ruído ---
    function addAndShowNoise() {
        const noise = t.map(() => (Math.random() - 0.5) * 1.5); // Ruído gaussiano simulado
        noisySignal = combinedSignal.map((sample, i) => sample + noise[i]);

        const layout = { title: 'Sinal Combinado com Ruído' };
        createPlot('plot-noisy', [{ x: t, y: noisySignal, type: 'scatter' }], layout);

        updateDescription(`
            <p><strong>Passo 3: Adição de Ruído</strong></p>
            <p>Adicionamos ruído aleatório ao sinal combinado para simular condições do mundo real, onde os sinais raramente são perfeitamente limpos.</p>
        `);
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

    // --- Passo 4: Aplicar e Mostrar FFT ---
    function applyAndShowFFT() {
        // Lê as frequências atuais dos sliders para a descrição
        const f1 = parseFloat(freq1Slider.value);
        const f2 = parseFloat(freq2Slider.value);

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
            <p>Aplicamos a Transformada de Fourier para converter o sinal do domínio do tempo para o domínio da frequência. Isso nos permite ver quais frequências compõem o sinal. Os picos devem corresponder às frequências originais (${f1} Hz e ${f2} Hz), mas o ruído adiciona componentes em várias outras frequências.</p>
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

            const layout = {
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
                plotDiv = createPlot('plot-fft-filtered', [{ x: frequencies, y: P1_filtered, type: 'scatter' }], layout);
            } else {
                Plotly.react(plotDiv, [{ x: frequencies, y: P1_filtered, type: 'scatter' }], layout);
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

        updateDescription(`
            <p><strong>Passo 6: Reconstrução do Sinal</strong></p>
            <p>Aplicamos a Transformada Inversa de Fourier (IFFT) no espectro filtrado por magnitude. O resultado é um sinal muito mais limpo, pois os componentes de baixa amplitude (ruído) foram removidos.</p>
        `);
    }

    // --- Passo 7: Identificar Picos ---
    function identifyAndShowPeaks() {
        // Lê as frequências atuais dos sliders para a descrição
        const f1 = parseFloat(freq1Slider.value);
        const f2 = parseFloat(freq2Slider.value);

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
            <p>Finalmente, analisamos o espectro do sinal <strong>filtrado</strong>. Os picos de magnitude são claramente visíveis, e o ruído foi removido. Os picos identificados foram em <strong>${peakFrequencies.join(' Hz e ')} Hz</strong>, correspondendo às frequências originais (${f1} Hz e ${f2} Hz).</p>
            <p><strong>Demonstração Concluída!</strong></p>
        `);
    }

    // Inicialização
    setupControls();
    resetSimulation();
}); 