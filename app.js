// Neuroinsight ABIDE II Storytelling App Logic

// Global data cache
let datasets = {};
let activeStep = 0;
let scroller;

// Canvas Animated background for Hero Section
function initHeroCanvas() {
    const canvas = document.getElementById('hero-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const particles = [];
    const particleCount = 75;
    const connectionDistance = 120;
    let mouse = { x: null, y: null, active: false };

    class Particle {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.vx = (Math.random() - 0.5) * 0.8;
            this.vy = (Math.random() - 0.5) * 0.8;
            this.radius = Math.random() * 2 + 1;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;

            // Bounce on walls
            if (this.x < 0 || this.x > width) this.vx *= -1;
            if (this.y < 0 || this.y > height) this.vy *= -1;
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 245, 212, 0.4)';
            ctx.fill();
        }
    }

    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }

    window.addEventListener('resize', () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    });

    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
        mouse.active = true;
    });

    canvas.addEventListener('mouseleave', () => {
        mouse.active = false;
    });

    function animate() {
        ctx.clearRect(0, 0, width, height);

        // Draw connections
        for (let i = 0; i < particles.length; i++) {
            particles[i].update();
            particles[i].draw();

            // Connect to other particles
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < connectionDistance) {
                    const alpha = (1 - dist / connectionDistance) * 0.15;
                    ctx.strokeStyle = `rgba(0, 245, 212, ${alpha})`;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }

            // Connect to mouse
            if (mouse.active) {
                const mdx = particles[i].x - mouse.x;
                const mdy = particles[i].y - mouse.y;
                const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
                if (mdist < 180) {
                    const alpha = (1 - mdist / 180) * 0.25;
                    ctx.strokeStyle = `rgba(131, 56, 236, ${alpha})`;
                    ctx.lineWidth = 1.2;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(mouse.x, mouse.y);
                    ctx.stroke();
                }
            }
        }

        requestAnimationFrame(animate);
    }

    animate();
}

// App Initialization
document.addEventListener("DOMContentLoaded", () => {
    initHeroCanvas();
    loadAllData().then(() => {
        initScrollama();
        initDownloadPDF();
        // Draw initial chart
        renderChart(0);
    }).catch(err => {
        console.error("Error inicializando la aplicación: ", err);
    });
});

// Download PDF/Print Trigger
function initDownloadPDF() {
    const btn = document.getElementById('btn-download-pdf');
    if (btn) {
        btn.addEventListener('click', () => {
            window.print();
        });
    }
}

// Load all 10 CSV data files concurrently
function loadAllData() {
    const paths = {
        csv1: "data/01_Dispersion_Severidad_ADOS_vs_CPRS.csv",
        csv2: "data/02_Barras_Comorbilidades_Ansiedad_TDAH_Sexo.csv",
        csv3: "data/03_Anillo_Subtipos_TDAH_en_TEA.csv",
        csv4: "data/04_Venn_Interseccion_Subtipos_TDAH.csv",
        csv5: "data/05_Boxplot_UsoMedicamente_Severidad_TEA.csv",
        csv6: "data/06_Violin_Distribucion_FIQ_por_Sexo_TDAH.csv",
        csv7: "data/07_Radar_Perfiles_Cognitivos_Promedio.csv",
        csv8: "data/08_Master_Dashboard_Multivariante.csv",
        csv9: "data/09_Piramide_Poblacional_Edad_Sexo_DX.csv",
        csv10: "data/10_Burbujas_RespuestaSocial_SRS_vs_CSI_TDAH.csv"
    };

    const promises = Object.keys(paths).map(key => 
        d3.csv(paths[key]).then(data => {
            datasets[key] = data;
            return { key: key, success: true };
        })
    );

    return Promise.all(promises);
}

// Scrollama Scrollytelling Setup
function initScrollama() {
    scroller = scrollama();

    scroller
        .setup({
            step: ".step",
            offset: 0.5,
            debug: false
        })
        .onStepEnter(response => {
            const stepIndex = parseInt(response.element.dataset.step);
            activeStep = stepIndex;
            
            // Update step CSS active class
            d3.selectAll(".step").classed("active", (d, i) => i === stepIndex);
            
            // Update active dots tracker
            d3.selectAll(".tracker-dot").classed("active", (d, i) => i === stepIndex);

            // Render Chart
            renderChart(stepIndex);
        });

    window.addEventListener("resize", scroller.resize);

    // Click behavior for dots
    d3.selectAll(".tracker-dot").on("click", function() {
        const index = parseInt(this.dataset.step);
        const targetStep = document.querySelector(`.step[data-step="${index}"]`);
        if (targetStep) {
            targetStep.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });
}

// Unified Render Function for sticky panel
function renderChart(stepIndex) {
    const container = d3.select("#chart-container");
    const titleEl = document.getElementById("dynamic-chart-title");
    const subtitleEl = document.getElementById("dynamic-chart-subtitle");
    const kpiOverlay = document.getElementById("kpi-overlay");
    const legendEl = d3.select("#chart-legend");

    // Reset container, KPI overlay, and legend
    container.html("");
    legendEl.html("");
    kpiOverlay.classList.add("hidden");

    // Dynamic Chart Labels & Routing (exactly aligned to the order in ABIDEII_Build_Dataset.txt)
    switch(stepIndex) {
        case 0:
            titleEl.innerText = "Relación entre Severidad del Autismo y Síntomas de TDAH";
            subtitleEl.innerText = "Correlación de puntuaciones de gravedad (ADOS-2 vs CPRS Total) por sexo";
            kpiOverlay.classList.remove("hidden");
            drawChart1(datasets.csv1, container, legendEl);
            break;
        case 1:
            titleEl.innerText = "Prevalencia de Comorbilidades en el Grupo TEA";
            subtitleEl.innerText = "Porcentaje de pacientes en el espectro con ansiedad (GAD) y TDAH comórbido por sexo";
            drawChart2(datasets.csv2, container, legendEl);
            break;
        case 2:
            titleEl.innerText = "Proporción de Subtipos de TDAH en Autismo";
            subtitleEl.innerText = "Distribución porcentual de los subtipos clínicos del TDAH en el grupo con TEA";
            drawChart3(datasets.csv3, container, legendEl);
            break;
        case 3:
            titleEl.innerText = "Solapamiento de Subtipos de TDAH (Criterios CASI)";
            subtitleEl.innerText = "Intersección de participantes que cumplen criterios de inatención e hiperactividad";
            drawChart4(datasets.csv4, container, legendEl);
            break;
        case 4:
            titleEl.innerText = "Severidad del Autismo según el Uso de Medicación";
            subtitleEl.innerText = "Distribución de severidad ADOS-2 cruzada por estatus de medicación, sexo y comorbilidad TDAH";
            drawChart5(datasets.csv5, container, legendEl);
            break;
        case 5:
            titleEl.innerText = "Distribución del Coeficiente Intelectual Total (FIQ)";
            subtitleEl.innerText = "Curvas de densidad de CI según diagnóstico, sexo y presencia de TDAH";
            drawChart6(datasets.csv6, container, legendEl);
            break;
        case 6:
            titleEl.innerText = "Perfiles CI Promedio (Verbal vs de Ejecución vs Total)";
            subtitleEl.innerText = "Métricas cognitivas comparadas (FIQ, PIQ, VIQ) por grupo clínico, sexo y TDAH";
            drawChart7(datasets.csv7, container, legendEl);
            break;
        case 7:
            titleEl.innerText = "Panorama Multivariante: Inteligencia vs Severidad";
            subtitleEl.innerText = "Relación entre CI (FIQ) y Severidad del Autismo (ADOS-2) facetado por sexo y diagnóstico";
            drawChart8(datasets.csv8, container, legendEl);
            break;
        case 8:
            titleEl.innerText = "Pirámide Poblacional de Registro";
            subtitleEl.innerText = "Participantes clasificados por diagnóstico, edad y sexo biológico";
            drawChart9(datasets.csv9, container, legendEl);
            break;
        case 9:
            titleEl.innerText = "Afectación Social vs Severidad TDAH según Edad y Sexo";
            subtitleEl.innerText = "Relación de escalas clínicas SRS y CSI, donde el tamaño representa la edad de escaneo";
            drawChart10(datasets.csv10, container, legendEl);
            break;
        default:
            container.html("<p class='text-dim'>Visualización no implementada.</p>");
    }
}

/* Helpers for D3 Layout */
function getDimensions(container) {
    const rect = container.node().getBoundingClientRect();
    const margin = { top: 25, right: 30, bottom: 40, left: 45 };
    const width = rect.width - margin.left - margin.right;
    const height = rect.height - margin.top - margin.bottom;
    return { width, height, margin };
}

function createTooltip(container) {
    let tooltip = d3.select("body").select(".d3-tooltip");
    if (tooltip.empty()) {
        tooltip = d3.select("body").append("div")
            .attr("class", "d3-tooltip")
            .style("opacity", 0);
    }
    return tooltip;
}

// ----------------------------------------------------
// CHART 9: Pirámide Poblacional
// 09_Piramide_Poblacional_Edad_Sexo_DX.csv
// ----------------------------------------------------
function drawChart9(data, container, legendEl) {
    const { width, height, margin } = getDimensions(container);
    
    // Setup legends
    legendEl.html(`
        <div class="legend-item"><div class="legend-color" style="background:#00f5d4"></div><span>Masculino</span></div>
        <div class="legend-item"><div class="legend-color" style="background:#d90429"></div><span>Femenino</span></div>
    `);

    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const tooltip = createTooltip();

    // Parse counts
    data.forEach(d => {
        d.Conteo = +d.Conteo;
        d.Conteo_Piramide = +d.Conteo_Piramide;
    });

    // We have facets: dx_label (Autismo (TEA) vs Control Típico)
    const dxGroups = Array.from(new Set(data.map(d => d.dx_label)));
    const ageBins = Array.from(new Set(data.map(d => d.age_bin))).sort((a,b) => {
        // Sort order helper
        const order = {"6-12": 1, "13-18": 2, "19-25": 3, "26-40": 4, ">40": 5};
        return (order[a] || 0) - (order[b] || 0);
    });

    // Half width for facets
    const facetWidth = (width - 40) / 2;

    dxGroups.forEach((dx, idx) => {
        const g = svg.append("g")
            .attr("transform", `translate(${idx * (facetWidth + 40)}, 0)`);

        // Facet Title
        g.append("text")
            .attr("x", facetWidth / 2)
            .attr("y", -5)
            .attr("text-anchor", "middle")
            .attr("class", "axis-label")
            .text(dx);

        // Scales
        const yScale = d3.scaleBand()
            .domain(ageBins)
            .range([height, 0])
            .padding(0.2);

        const maxCount = d3.max(data, d => d.Conteo);
        const xScale = d3.scaleLinear()
            .domain([-maxCount, maxCount])
            .range([0, facetWidth]);

        // Draw grid lines
        g.append("g")
            .attr("class", "grid-line")
            .attr("transform", `translate(0, ${height})`)
            .call(d3.axisBottom(xScale).ticks(5).tickSize(-height).tickFormat(""));

        // Draw bars
        g.selectAll(".bar")
            .data(dxData = data.filter(d => d.dx_label === dx))
            .enter().append("rect")
            .attr("class", "bar")
            .attr("x", d => d.sex_label === "Masculino" ? xScale(d.Conteo_Piramide) : xScale(0))
            .attr("y", d => yScale(d.age_bin))
            .attr("width", d => d.sex_label === "Masculino" ? xScale(0) - xScale(d.Conteo_Piramide) : xScale(d.Conteo) - xScale(0))
            .attr("height", yScale.bandwidth())
            .attr("fill", d => d.sex_label === "Masculino" ? "#00f5d4" : "#d90429")
            .attr("opacity", 0.85)
            .attr("rx", 2)
            .on("mouseover", (event, d) => {
                tooltip.transition().duration(200).style("opacity", .9);
                tooltip.html(`
                    <strong>Diagnóstico:</strong> ${d.dx_label}<br/>
                    <strong>Rango Edad:</strong> ${d.age_bin}<br/>
                    <strong>Sexo:</strong> ${d.sex_label}<br/>
                    <strong>Cantidad:</strong> ${d.Conteo} participantes
                `)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
            })
            .on("mousemove", (event) => {
                tooltip.style("left", (event.pageX + 10) + "px")
                       .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", () => {
                tooltip.transition().duration(500).style("opacity", 0);
            });

        // X Axis
        g.append("g")
            .attr("transform", `translate(0, ${height})`)
            .call(d3.axisBottom(xScale).ticks(5).tickFormat(d => Math.abs(d)));

        // Y Axis (only for first facet in the middle, or both)
        if (idx === 0) {
            g.append("g")
                .call(d3.axisLeft(yScale));
        } else {
            g.append("g")
                .attr("transform", `translate(0, 0)`)
                .call(d3.axisLeft(yScale).tickSize(0).tickFormat(""));
        }

        // Center line
        g.append("line")
            .attr("x1", xScale(0))
            .attr("y1", 0)
            .attr("x2", xScale(0))
            .attr("y2", height)
            .attr("stroke", "rgba(255,255,255,0.3)")
            .attr("stroke-width", 1.5);
    });
}

// ----------------------------------------------------
// CHART 1: Scatter Plot (ADOS-2 vs CPRS)
// 01_Dispersion_Severidad_ADOS_vs_CPRS.csv
// ----------------------------------------------------
function drawChart1(data, container, legendEl) {
    const { width, height, margin } = getDimensions(container);

    legendEl.html(`
        <div class="legend-item"><div class="legend-color" style="background:#ff9f1c"></div><span>Comorbilidad TDAH</span></div>
        <div class="legend-item"><div class="legend-color" style="background:#00f5d4"></div><span>Sin Comorbilidad</span></div>
    `);

    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const tooltip = createTooltip();

    data.forEach(d => {
        d.ados_2_severity_total = +d.ados_2_severity_total;
        d.cprs_dsm_iv_total = +d.cprs_dsm_iv_total;
    });

    const facetWidth = (width - 40) / 2;
    const sexGroups = ["Masculino", "Femenino"];

    // Scales
    const xScale = d3.scaleLinear()
        .domain([0, 11])
        .range([0, facetWidth]);

    const yScale = d3.scaleLinear()
        .domain([30, 95])
        .range([height, 0]);

    sexGroups.forEach((sex, idx) => {
        const g = svg.append("g")
            .attr("transform", `translate(${idx * (facetWidth + 40)}, 0)`);

        const sexData = data.filter(d => d.sex_label === sex);

        // Title
        g.append("text")
            .attr("x", facetWidth / 2)
            .attr("y", -5)
            .attr("text-anchor", "middle")
            .attr("class", "axis-label")
            .text(`Sexo: ${sex}`);

        // Grid lines
        g.append("g")
            .attr("class", "grid-line")
            .attr("transform", `translate(0, ${height})`)
            .call(d3.axisBottom(xScale).ticks(5).tickSize(-height).tickFormat(""));
        g.append("g")
            .attr("class", "grid-line")
            .call(d3.axisLeft(yScale).ticks(5).tickSize(-facetWidth).tickFormat(""));

        // Jitter points and draw
        const jitterWidth = 0.25;
        g.selectAll(".dot")
            .data(sexData)
            .enter().append("circle")
            .attr("class", "dot")
            .attr("cx", d => xScale(d.ados_2_severity_total + (Math.random() - 0.5) * jitterWidth))
            .attr("cy", d => yScale(d.cprs_dsm_iv_total + (Math.random() - 0.5) * 2))
            .attr("r", 5)
            .attr("fill", d => d.adhd_comorbidity === "Sí" ? "#ff9f1c" : "#00f5d4")
            .attr("opacity", 0.7)
            .attr("stroke", "#101935")
            .attr("stroke-width", 0.8)
            .on("mouseover", (event, d) => {
                tooltip.transition().duration(200).style("opacity", .9);
                tooltip.html(`
                    <strong>ID:</strong> ${d.sub_id}<br/>
                    <strong>Severidad ADOS-2:</strong> ${d.ados_2_severity_total}<br/>
                    <strong>Síntomas TDAH (CPRS):</strong> ${d.cprs_dsm_iv_total}<br/>
                    <strong>Comorbilidad TDAH:</strong> ${d.adhd_comorbidity}
                `)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
            })
            .on("mousemove", (event) => {
                tooltip.style("left", (event.pageX + 10) + "px")
                       .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", () => {
                tooltip.transition().duration(500).style("opacity", 0);
            });

        // Compute regression lines for Sí/No comorbidity
        const comorbTypes = ["Sí", "No"];
        comorbTypes.forEach(comorb => {
            const groupData = sexData.filter(d => d.adhd_comorbidity === comorb);
            if (groupData.length > 1) {
                // Calculate simple linear regression: y = mx + c
                const xMean = d3.mean(groupData, d => d.ados_2_severity_total);
                const yMean = d3.mean(groupData, d => d.cprs_dsm_iv_total);
                
                let num = 0;
                let den = 0;
                groupData.forEach(d => {
                    num += (d.ados_2_severity_total - xMean) * (d.cprs_dsm_iv_total - yMean);
                    den += Math.pow(d.ados_2_severity_total - xMean, 2);
                });

                const slope = num / den;
                const intercept = yMean - slope * xMean;

                // Points for line
                const x1 = d3.min(groupData, d => d.ados_2_severity_total);
                const x2 = d3.max(groupData, d => d.ados_2_severity_total);
                const y1 = slope * x1 + intercept;
                const y2 = slope * x2 + intercept;

                g.append("line")
                    .attr("x1", xScale(x1))
                    .attr("y1", yScale(y1))
                    .attr("x2", xScale(x2))
                    .attr("y2", yScale(y2))
                    .attr("stroke", comorb === "Sí" ? "#ff9f1c" : "#00f5d4")
                    .attr("stroke-width", 2.5)
                    .attr("opacity", 0.9);
            }
        });

        // Axes
        g.append("g")
            .attr("transform", `translate(0, ${height})`)
            .call(d3.axisBottom(xScale).ticks(5));
        
        if (idx === 0) {
            g.append("g")
                .call(d3.axisLeft(yScale));
            
            // Y Label
            g.append("text")
                .attr("transform", "rotate(-90)")
                .attr("y", -35)
                .attr("x", -height / 2)
                .attr("text-anchor", "middle")
                .style("fill", "#fff")
                .text("Síntomas TDAH (CPRS Total)");
        } else {
            g.append("g")
                .call(d3.axisLeft(yScale).tickSize(0).tickFormat(""));
        }

        // X Label
        g.append("text")
            .attr("x", facetWidth / 2)
            .attr("y", height + 35)
            .attr("text-anchor", "middle")
            .style("fill", "#fff")
            .text("Severidad del Autismo (ADOS-2)");
    });
}

// ----------------------------------------------------
// CHART 2: Grouped Bar Chart (Prevalencia de Comorbilidades)
// 02_Barras_Comorbilidades_Ansiedad_TDAH_Sexo.csv
// ----------------------------------------------------
function drawChart2(data, container, legendEl) {
    const { width, height, margin } = getDimensions(container);

    legendEl.html(`
        <div class="legend-item"><div class="legend-color" style="background:#ff9f1c"></div><span>Ansiedad (GAD)</span></div>
        <div class="legend-item"><div class="legend-color" style="background:#00f5d4"></div><span>TDAH Comórbido</span></div>
    `);

    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const tooltip = createTooltip();

    // Prepare structure
    const formattedData = [];
    data.forEach(d => {
        formattedData.push({
            sex: d.sex_label,
            condition: "Ansiedad",
            percentage: +d.Pct_Ansiedad,
            count: +d.Casos_Ansiedad_GAD,
            total: +d.Total_Pacientes
        });
        formattedData.push({
            sex: d.sex_label,
            condition: "TDAH",
            percentage: +d.Pct_TDAH,
            count: +d.Casos_TDAH_Cualquiera,
            total: +d.Total_Pacientes
        });
    });

    const sexGroups = ["Femenino", "Masculino"];
    const conditions = ["Ansiedad", "TDAH"];

    // Scales
    const x0Scale = d3.scaleBand()
        .domain(sexGroups)
        .range([0, width])
        .padding(0.2);

    const x1Scale = d3.scaleBand()
        .domain(conditions)
        .range([0, x0Scale.bandwidth()])
        .padding(0.05);

    const yScale = d3.scaleLinear()
        .domain([0, 30]) // max value in data is ~24.6%
        .range([height, 0]);

    // Grid lines
    svg.append("g")
        .attr("class", "grid-line")
        .call(d3.axisLeft(yScale).ticks(5).tickSize(-width).tickFormat(""));

    // Draw bars
    svg.selectAll(".bar-group")
        .data(sexGroups)
        .enter().append("g")
        .attr("class", "bar-group")
        .attr("transform", d => `translate(${x0Scale(d)}, 0)`)
      .selectAll("rect")
        .data(sex => formattedData.filter(d => d.sex === sex))
        .enter().append("rect")
        .attr("x", d => x1Scale(d.condition))
        .attr("y", d => yScale(0))
        .attr("width", x1Scale.bandwidth())
        .attr("height", 0)
        .attr("fill", d => d.condition === "Ansiedad" ? "#ff9f1c" : "#00f5d4")
        .attr("opacity", 0.85)
        .attr("rx", 4)
        .on("mouseover", (event, d) => {
            tooltip.transition().duration(200).style("opacity", .9);
            tooltip.html(`
                <strong>Sexo:</strong> ${d.sex}<br/>
                <strong>Condición:</strong> ${d.condition === "Ansiedad" ? "Ansiedad (GAD)" : "TDAH"}<br/>
                <strong>Prevalencia:</strong> ${d.percentage.toFixed(2)}%<br/>
                <strong>Casos:</strong> ${d.count} de ${d.total} pacientes
            `)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
        })
        .on("mousemove", (event) => {
            tooltip.style("left", (event.pageX + 10) + "px")
                   .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", () => {
            tooltip.transition().duration(500).style("opacity", 0);
        })
      .transition()
        .duration(1000)
        .attr("y", d => yScale(d.percentage))
        .attr("height", d => height - yScale(d.percentage));

    // Percentage values above bars
    svg.selectAll(".bar-group")
      .selectAll("text")
        .data(sex => formattedData.filter(d => d.sex === sex))
        .enter().append("text")
        .attr("x", d => x1Scale(d.condition) + x1Scale.bandwidth() / 2)
        .attr("y", d => yScale(d.percentage) - 5)
        .attr("text-anchor", "middle")
        .attr("fill", "#fff")
        .style("font-size", "11px")
        .style("font-weight", "600")
        .text(d => `${d.percentage.toFixed(1)}%`);

    // Axes
    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x0Scale));

    svg.append("g")
        .call(d3.axisLeft(yScale).ticks(5).tickFormat(d => d + "%"));
}

// ----------------------------------------------------
// CHART 3: Donut Chart (Subtipos TDAH)
// 03_Anillo_Subtipos_TDAH_en_TEA.csv
// ----------------------------------------------------
function drawChart3(data, container, legendEl) {
    const { width, height } = getDimensions(container);
    const radius = Math.min(width, height) / 2.2;

    legendEl.html(`
        <div class="legend-item"><div class="legend-color" style="background:#8338ec"></div><span>Inatento</span></div>
        <div class="legend-item"><div class="legend-color" style="background:#ff9f1c"></div><span>Hiperactivo</span></div>
        <div class="legend-item"><div class="legend-color" style="background:#00f5d4"></div><span>Combinado</span></div>
    `);

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height)
      .append("g")
        .attr("transform", `translate(${width / 2}, ${height / 2})`);

    const tooltip = createTooltip();

    data.forEach(d => d.Conteo = +d.Conteo);
    const totalCount = d3.sum(data, d => d.Conteo);

    const colorScale = d3.scaleOrdinal()
        .domain(data.map(d => d.Subtipo_TDAH))
        .range(["#8338ec", "#ff9f1c", "#00f5d4"]);

    const pie = d3.pie()
        .value(d => d.Conteo)
        .sort(null);

    const arc = d3.arc()
        .innerRadius(radius * 0.55)
        .outerRadius(radius);

    const outerArc = d3.arc()
        .innerRadius(radius * 1.1)
        .outerRadius(radius * 1.1);

    const pieData = pie(data);

    // Draw donut arcs with animations
    const path = svg.selectAll("path")
        .data(pieData)
        .enter().append("path")
        .attr("fill", d => colorScale(d.data.Subtipo_TDAH))
        .attr("stroke", "#101935")
        .attr("stroke-width", 2)
        .attr("opacity", 0.85)
        .on("mouseover", (event, d) => {
            tooltip.transition().duration(200).style("opacity", .9);
            const pct = ((d.data.Conteo / totalCount) * 100).toFixed(1);
            tooltip.html(`
                <strong>Subtipo TDAH:</strong> ${d.data.Subtipo_TDAH}<br/>
                <strong>Casos:</strong> ${d.data.Conteo}<br/>
                <strong>Proporción:</strong> ${pct}%
            `)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
        })
        .on("mousemove", (event) => {
            tooltip.style("left", (event.pageX + 10) + "px")
                   .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", () => {
            tooltip.transition().duration(500).style("opacity", 0);
        });

    path.transition()
        .duration(1000)
        .attrTween("d", function(d) {
            const interpolate = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
            return function(t) {
                return arc(interpolate(t));
            };
        });

    // Add labels inside the segments
    const labelGroup = svg.append("g");

    const labels = labelGroup.selectAll("text")
        .data(pieData)
        .enter().append("text")
        .attr("text-anchor", "middle")
        .attr("fill", "#fff")
        .style("font-size", "10px")
        .style("font-weight", "700")
        .attr("opacity", 0)
        .attr("transform", d => `translate(${arc.centroid(d)})`);

    labels.append("tspan")
        .attr("x", 0)
        .attr("dy", "-0.3em")
        .text(d => d.data.Subtipo_TDAH);

    labels.append("tspan")
        .attr("x", 0)
        .attr("dy", "1.1em")
        .text(d => {
            const pct = ((d.data.Conteo / totalCount) * 100).toFixed(1);
            return `${pct}%`;
        });

    labels.transition()
        .delay(600)
        .duration(400)
        .attr("opacity", 1);

    // Center Total text
    svg.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "-0.2em")
        .attr("fill", "var(--color-text-dim)")
        .style("font-size", "11px")
        .text("TOTAL CASOS");

    svg.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "1em")
        .attr("fill", "#fff")
        .style("font-size", "22px")
        .style("font-weight", "800")
        .text(totalCount);
}

// ----------------------------------------------------
// CHART 4: Venn Diagram (Intersección de Subtipos CASI)
// 04_Venn_Interseccion_Subtipos_TDAH.csv
// ----------------------------------------------------
function drawChart4(data, container, legendEl) {
    const { width, height } = getDimensions(container);

    legendEl.html(`
        <div class="legend-item"><span style="color:#8338ec;font-weight:bold">Inatento</span></div>
        <div class="legend-item"><span style="color:#ff9f1c;font-weight:bold">Hiperactivo</span></div>
        <div class="legend-item"><span style="color:#00f5d4;font-weight:bold">Combinado</span></div>
    `);

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height);

    const tooltip = createTooltip();

    // Calculate intersections in JS
    let counts = {
        I: 0, H: 0, C: 0,       // Singles
        IH: 0, IC: 0, HC: 0,    // Doubles
        IHC: 0                  // Triple
    };

    data.forEach(d => {
        const isI = d.casi_adhd_i_cutoff === "Cumple";
        const isH = d.casi_adhd_h_cutoff === "Cumple";
        const isC = d.casi_adhd_c_cutoff === "Cumple";

        if (isI && isH && isC) counts.IHC++;
        else if (isI && isH) counts.IH++;
        else if (isI && isC) counts.IC++;
        else if (isH && isC) counts.HC++;
        else if (isI) counts.I++;
        else if (isH) counts.H++;
        else if (isC) counts.C++;
    });

    // Positions for 3 Venn Circles
    const center = { x: width / 2, y: height / 2 - 10 };
    const r = Math.min(width, height) / 4.2;
    const offset = r * 0.6; // circle distance offset

    // Define 3 circles coordinates
    const circles = [
        { key: "Inatento", cx: center.x - offset, cy: center.y - offset / 2, color: "#8338ec" },
        { key: "Hiperactivo/Impulsivo", cx: center.x + offset, cy: center.y - offset / 2, color: "#ff9f1c" },
        { key: "Combinado", cx: center.x, cy: center.y + offset, color: "#00f5d4" }
    ];

    // Draw circles with blend mode mix-blend-mode: screen
    svg.selectAll(".venn-circle")
        .data(circles)
        .enter().append("circle")
        .attr("cx", d => d.cx)
        .attr("cy", d => d.cy)
        .attr("r", r)
        .attr("fill", d => d.color)
        .attr("opacity", 0.45)
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5)
        .style("mix-blend-mode", "screen");

    // Add labels for sets
    svg.selectAll(".venn-label")
        .data(circles)
        .enter().append("text")
        .attr("x", d => d.key === "Combinado" ? d.cx : (d.cx + (d.cx < center.x ? -r/1.3 : r/1.3)))
        .attr("y", d => d.key === "Combinado" ? d.cy + r * 1.3 : d.cy - r * 1.1)
        .attr("text-anchor", "middle")
        .attr("fill", d => d.color)
        .style("font-size", "12px")
        .style("font-weight", "700")
        .text(d => d.key);

    // Coordinate intersections for values
    // Single regions
    const valueLabels = [
        { text: counts.I, x: center.x - offset * 1.4, y: center.y - offset * 0.8, name: "Solo Inatento" },
        { text: counts.H, x: center.x + offset * 1.4, y: center.y - offset * 0.8, name: "Solo Hiperactivo" },
        { text: counts.C, x: center.x, y: center.y + offset * 1.4, name: "Solo Combinado" },
        // Double overlaps
        { text: counts.IH, x: center.x, y: center.y - offset * 0.8, name: "Inatento & Hiperactivo" },
        { text: counts.IC, x: center.x - offset * 0.8, y: center.y + offset * 0.3, name: "Inatento & Combinado" },
        { text: counts.HC, x: center.x + offset * 0.8, y: center.y + offset * 0.3, name: "Hiperactivo & Combinado" },
        // Triple overlap
        { text: counts.IHC, x: center.x, y: center.y + offset * 0.1, name: "Triple Intersección" }
    ];

    svg.selectAll(".venn-value")
        .data(valueLabels)
        .enter().append("text")
        .attr("x", d => d.x)
        .attr("y", d => d.y)
        .attr("text-anchor", "middle")
        .attr("fill", "#fff")
        .style("font-size", "14px")
        .style("font-weight", "800")
        .text(d => d.text)
        .on("mouseover", (event, d) => {
            tooltip.transition().duration(200).style("opacity", .9);
            tooltip.html(`
                <strong>Región:</strong> ${d.name}<br/>
                <strong>Participantes:</strong> ${d.text}
            `)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
        })
        .on("mousemove", (event) => {
            tooltip.style("left", (event.pageX + 10) + "px")
                   .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", () => {
            tooltip.transition().duration(500).style("opacity", 0);
        });
}

// ----------------------------------------------------
// CHART 5: Faceted Boxplots (Uso de Medicación vs ADOS-2)
// 05_Boxplot_UsoMedicamente_Severidad_TEA.csv
// ----------------------------------------------------
function drawChart5(data, container, legendEl) {
    const { width, height, margin } = getDimensions(container);

    legendEl.html(`
        <div class="legend-item"><div class="legend-color" style="background:#d90429"></div><span>Sí (Medicados)</span></div>
        <div class="legend-item"><div class="legend-color" style="background:#00f5d4"></div><span>No (Sin Medicar)</span></div>
    `);

    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const tooltip = createTooltip();

    // Clean data
    const cleaned = data.filter(d => d.adhd_comorbidity !== "NA" && d.med_label !== "Desconocido");
    cleaned.forEach(d => d.ados_2_severity_total = +d.ados_2_severity_total);

    const sexTypes = ["Masculino", "Femenino"];
    const adhdTypes = ["Sí", "No"];

    const cellWidth = (width - 40) / 2;
    const cellHeight = (height - 40) / 2;

    const yScale = d3.scaleLinear()
        .domain([0, 11])
        .range([cellHeight, 0]);

    const xScale = d3.scaleBand()
        .domain(["Sí", "No"])
        .range([0, cellWidth])
        .padding(0.4);

    adhdTypes.forEach((adhd, rIdx) => {
        sexTypes.forEach((sex, cIdx) => {
            const g = svg.append("g")
                .attr("transform", `translate(${cIdx * (cellWidth + 40)}, ${rIdx * (cellHeight + 40)})`);

            const cellData = cleaned.filter(d => d.sex_label === sex && d.adhd_comorbidity === adhd);

            g.append("text")
                .attr("x", cellWidth / 2)
                .attr("y", -8)
                .attr("text-anchor", "middle")
                .style("fill", "#fff")
                .style("font-size", "10px")
                .style("font-weight", "600")
                .text(`${sex} | TDAH: ${adhd}`);

            g.append("g")
                .attr("class", "grid-line")
                .call(d3.axisLeft(yScale).ticks(5).tickSize(-cellWidth).tickFormat(""));

            ["Sí", "No"].forEach(med => {
                const values = cellData.filter(d => d.med_label === med)
                                       .map(d => d.ados_2_severity_total)
                                       .sort(d3.ascending);
                
                if (values.length >= 2) {
                    const q1 = d3.quantile(values, 0.25);
                    const median = d3.quantile(values, 0.5);
                    const q3 = d3.quantile(values, 0.75);
                    const iqr = q3 - q1;
                    const minVal = Math.max(0, q1 - 1.5 * iqr);
                    const maxVal = Math.min(10, q3 + 1.5 * iqr);
                    const outliers = values.filter(v => v < minVal || v > maxVal);

                    const xPos = xScale(med);
                    const w = xScale.bandwidth();

                    g.append("line")
                        .attr("x1", xPos + w/2)
                        .attr("y1", yScale(minVal))
                        .attr("x2", xPos + w/2)
                        .attr("y2", yScale(maxVal))
                        .attr("stroke", "rgba(255,255,255,0.4)")
                        .attr("stroke-width", 1.5);

                    g.append("rect")
                        .attr("x", xPos)
                        .attr("y", yScale(q3))
                        .attr("width", w)
                        .attr("height", yScale(q1) - yScale(q3))
                        .attr("fill", med === "Sí" ? "#d90429" : "#00f5d4")
                        .attr("opacity", 0.85)
                        .attr("rx", 3)
                        .on("mouseover", (event) => {
                            tooltip.transition().duration(200).style("opacity", .9);
                            tooltip.html(`
                                <strong>Grupo:</strong> ${sex} | TDAH: ${adhd}<br/>
                                <strong>¿Usa Medicación?:</strong> ${med}<br/>
                                <strong>Mínimo:</strong> ${minVal}<br/>
                                <strong>Percentil 25 (Q1):</strong> ${q1}<br/>
                                <strong>Mediana:</strong> ${median}<br/>
                                <strong>Percentil 75 (Q3):</strong> ${q3}<br/>
                                <strong>Máximo:</strong> ${maxVal}
                            `)
                            .style("left", (event.pageX + 10) + "px")
                            .style("top", (event.pageY - 28) + "px");
                        })
                        .on("mousemove", (event) => {
                            tooltip.style("left", (event.pageX + 10) + "px")
                                   .style("top", (event.pageY - 28) + "px");
                        })
                        .on("mouseout", () => {
                            tooltip.transition().duration(500).style("opacity", 0);
                        });

                    g.append("line")
                        .attr("x1", xPos)
                        .attr("y1", yScale(median))
                        .attr("x2", xPos + w)
                        .attr("y2", yScale(median))
                        .attr("stroke", "#101935")
                        .attr("stroke-width", 2.5);

                    g.append("line")
                        .attr("x1", xPos + w/4)
                        .attr("y1", yScale(minVal))
                        .attr("x2", xPos + 3*w/4)
                        .attr("y2", yScale(minVal))
                        .attr("stroke", "rgba(255,255,255,0.4)")
                        .attr("stroke-width", 1.5);
                    
                    g.append("line")
                        .attr("x1", xPos + w/4)
                        .attr("y1", yScale(maxVal))
                        .attr("x2", xPos + 3*w/4)
                        .attr("y2", yScale(maxVal))
                        .attr("stroke", "rgba(255,255,255,0.4)")
                        .attr("stroke-width", 1.5);

                    if (outliers.length > 0) {
                        g.selectAll(`.outlier-${med}`)
                            .data(outliers)
                            .enter().append("circle")
                            .attr("cx", xPos + w/2)
                            .attr("cy", d => yScale(d))
                            .attr("r", 3)
                            .attr("fill", "#fff")
                            .attr("opacity", 0.8);
                    }
                }
            });

            if (cIdx === 0) {
                g.append("g").call(d3.axisLeft(yScale).ticks(5));
            } else {
                g.append("g").call(d3.axisLeft(yScale).tickSize(0).tickFormat(""));
            }

            if (rIdx === 1) {
                g.append("g")
                    .attr("transform", `translate(0, ${cellHeight})`)
                    .call(d3.axisBottom(xScale));
            } else {
                g.append("g")
                    .attr("transform", `translate(0, ${cellHeight})`)
                    .call(d3.axisBottom(xScale).tickSize(0).tickFormat(""));
            }
        });
    });
}

// ----------------------------------------------------
// CHART 6: Violin Plots (Distribución de FIQ)
// 06_Violin_Distribucion_FIQ_por_Sexo_TDAH.csv
// ----------------------------------------------------
function drawChart6(data, container, legendEl) {
    const { width, height, margin } = getDimensions(container);

    legendEl.html(`
        <div class="legend-item"><div class="legend-color" style="background:#ff9f1c"></div><span>Con TDAH</span></div>
        <div class="legend-item"><div class="legend-color" style="background:#00f5d4"></div><span>Sin TDAH</span></div>
    `);

    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const tooltip = createTooltip();

    const cleaned = data.filter(d => d.adhd_comorbidity !== "NA");
    cleaned.forEach(d => d.fiq = +d.fiq);

    const dxGroups = ["Autismo (TEA)", "Control Típico"];
    const facetWidth = (width - 40) / 2;

    const yScale = d3.scaleLinear()
        .domain([40, 160])
        .range([height, 0]);

    const xScale = d3.scaleBand()
        .domain(["Femenino", "Masculino"])
        .range([0, facetWidth])
        .padding(0.25);

    function kernelDensityEstimator(kernel, X) {
        return function(V) {
            return X.map(x => [x, d3.mean(V, v => kernel(x - v))]);
        };
    }
    function epanechnikov(bandwidth) {
        return function(v) {
            return Math.abs(v /= bandwidth) <= 1 ? 0.75 * (1 - v * v) / bandwidth : 0;
        };
    }

    dxGroups.forEach((dx, dxIdx) => {
        const g = svg.append("g")
            .attr("transform", `translate(${dxIdx * (facetWidth + 40)}, 0)`);

        const dxData = cleaned.filter(d => d.dx_label === dx);

        g.append("text")
            .attr("x", facetWidth / 2)
            .attr("y", -8)
            .attr("text-anchor", "middle")
            .attr("class", "axis-label")
            .text(dx);

        g.append("g")
            .attr("class", "grid-line")
            .call(d3.axisLeft(yScale).ticks(6).tickSize(-facetWidth).tickFormat(""));

        ["Femenino", "Masculino"].forEach(sex => {
            ["Sí", "No"].forEach(tdah => {
                const subset = dxData.filter(d => d.sex_label === sex && d.adhd_comorbidity === tdah)
                                     .map(d => d.fiq);

                if (subset.length >= 5) {
                    const kde = kernelDensityEstimator(epanechnikov(7), yScale.ticks(40));
                    const density = kde(subset);

                    const xBandPos = xScale(sex);
                    const bandWidth = xScale.bandwidth();

                    const maxDensity = d3.max(density, d => d[1]) || 1;
                    
                    const isTdahYes = tdah === "Sí";
                    const xOffset = isTdahYes ? xBandPos + bandWidth*0.22 : xBandPos + bandWidth*0.68;
                    const halfWidth = bandWidth * 0.22;

                    const widthScale = d3.scaleLinear()
                        .domain([0, maxDensity])
                        .range([0, halfWidth]);

                    const areaGenerator = d3.area()
                        .x0(d => xOffset - widthScale(d[1]))
                        .x1(d => xOffset + widthScale(d[1]))
                        .y(d => yScale(d[0]))
                        .curve(d3.curveBasis);

                    g.append("path")
                        .datum(density)
                        .attr("class", "violin")
                        .attr("d", areaGenerator)
                        .attr("fill", tdah === "Sí" ? "#ff9f1c" : "#00f5d4")
                        .attr("opacity", 0.7)
                        .attr("stroke", "#101935")
                        .attr("stroke-width", 1)
                        .on("mouseover", (event) => {
                            tooltip.transition().duration(200).style("opacity", .9);
                            tooltip.html(`
                                <strong>Diagnóstico:</strong> ${dx}<br/>
                                <strong>Sexo:</strong> ${sex}<br/>
                                <strong>TDAH Comórbido:</strong> ${tdah}<br/>
                                <strong>Participantes:</strong> ${subset.length}<br/>
                                <strong>CI Promedio:</strong> ${d3.mean(subset).toFixed(1)} pts
                            `)
                            .style("left", (event.pageX + 10) + "px")
                            .style("top", (event.pageY - 28) + "px");
                        })
                        .on("mousemove", (event) => {
                            tooltip.style("left", (event.pageX + 10) + "px")
                                   .style("top", (event.pageY - 28) + "px");
                        })
                        .on("mouseout", () => {
                            tooltip.transition().duration(500).style("opacity", 0);
                        });

                    const sorted = subset.sort(d3.ascending);
                    const q1 = d3.quantile(sorted, 0.25);
                    const median = d3.quantile(sorted, 0.5);
                    const q3 = d3.quantile(sorted, 0.75);

                    g.append("circle")
                        .attr("cx", xOffset)
                        .attr("cy", yScale(median))
                        .attr("r", 2.5)
                        .attr("fill", "#fff");

                    g.append("line")
                        .attr("x1", xOffset)
                        .attr("y1", yScale(q1))
                        .attr("x2", xOffset)
                        .attr("y2", yScale(q3))
                        .attr("stroke", "#fff")
                        .attr("stroke-width", 2);
                }
            });
        });

        g.append("g")
            .attr("transform", `translate(0, ${height})`)
            .call(d3.axisBottom(xScale));

        if (dxIdx === 0) {
            g.append("g").call(d3.axisLeft(yScale));
        } else {
            g.append("g").call(d3.axisLeft(yScale).tickSize(0).tickFormat(""));
        }
    });
}

// ----------------------------------------------------
// CHART 7: Profile line chart (Cognitive Profiles)
// 07_Radar_Perfiles_Cognitivos_Promedio.csv
// ----------------------------------------------------
function drawChart7(data, container, legendEl) {
    const { width, height, margin } = getDimensions(container);

    legendEl.html(`
        <div class="legend-item"><div class="legend-color" style="background:#8338ec"></div><span>Femenino</span></div>
        <div class="legend-item"><div class="legend-color" style="background:#00f5d4"></div><span>Masculino</span></div>
        <div class="legend-item"><span>— Solido: Sin TDAH</span></div>
        <div class="legend-item"><span>- - Trazo: Con TDAH</span></div>
    `);

    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const tooltip = createTooltip();

    const parsed = [];
    data.forEach(d => {
        const tdah = d.adhd_comorbidity === "NA" ? "No" : d.adhd_comorbidity;
        
        parsed.push({
            dx: d.dx_label,
            sex: d.sex_label,
            tdah: tdah,
            escala: "CI Total (FIQ)",
            score: +d.Promedio_FIQ
        });
        parsed.push({
            dx: d.dx_label,
            sex: d.sex_label,
            tdah: tdah,
            escala: "CI Verbal (VIQ)",
            score: +d.Promedio_VIQ
        });
        parsed.push({
            dx: d.dx_label,
            sex: d.sex_label,
            tdah: tdah,
            escala: "CI Ejecución (PIQ)",
            score: +d.Promedio_PIQ
        });
    });

    const dxGroups = ["Autismo (TEA)", "Control Típico"];
    const facetWidth = (width - 40) / 2;

    const yScale = d3.scaleLinear()
        .domain([95, 122])
        .range([height, 0]);

    const xScale = d3.scalePoint()
        .domain(["CI Total (FIQ)", "CI Verbal (VIQ)", "CI de Ejecución (PIQ)"])
        .range([20, facetWidth - 20]);

    const lineGen = d3.line()
        .x(d => xScale(d.escala === "CI Ejecución (PIQ)" ? "CI de Ejecución (PIQ)" : d.escala))
        .y(d => yScale(d.score));

    dxGroups.forEach((dx, dxIdx) => {
        const g = svg.append("g")
            .attr("transform", `translate(${dxIdx * (facetWidth + 40)}, 0)`);

        const dxData = parsed.filter(d => d.dx === dx);

        g.append("text")
            .attr("x", facetWidth / 2)
            .attr("y", -8)
            .attr("text-anchor", "middle")
            .attr("class", "axis-label")
            .text(dx);

        g.append("g")
            .attr("class", "grid-line")
            .call(d3.axisLeft(yScale).ticks(5).tickSize(-facetWidth).tickFormat(""));

        const cohorts = [
            { sex: "Femenino", tdah: "Sí", color: "#8338ec", dash: "4 4" },
            { sex: "Femenino", tdah: "No", color: "#8338ec", dash: "0" },
            { sex: "Masculino", tdah: "Sí", color: "#00f5d4", dash: "4 4" },
            { sex: "Masculino", tdah: "No", color: "#00f5d4", dash: "0" }
        ];

        cohorts.forEach(cohort => {
            const cohortPoints = dxData.filter(d => d.sex === cohort.sex && d.tdah === cohort.tdah);
            const order = { "CI Total (FIQ)": 1, "CI Verbal (VIQ)": 2, "CI de Ejecución (PIQ)": 3 };
            cohortPoints.sort((a,b) => order[a.escala] - order[b.escala]);

            if (cohortPoints.length > 0) {
                g.append("path")
                    .datum(cohortPoints)
                    .attr("fill", "none")
                    .attr("stroke", cohort.color)
                    .attr("stroke-width", 2.5)
                    .attr("stroke-dasharray", cohort.dash)
                    .attr("d", lineGen)
                    .attr("opacity", 0.9);

                g.selectAll(`.dot-${cohort.sex}-${cohort.tdah}`)
                    .data(cohortPoints)
                    .enter().append("circle")
                    .attr("cx", d => xScale(d.escala === "CI Ejecución (PIQ)" ? "CI de Ejecución (PIQ)" : d.escala))
                    .attr("cy", d => yScale(d.score))
                    .attr("r", 5)
                    .attr("fill", cohort.color)
                    .attr("stroke", "#101935")
                    .attr("stroke-width", 1)
                    .on("mouseover", (event, d) => {
                        tooltip.transition().duration(200).style("opacity", .9);
                        tooltip.html(`
                            <strong>Grupo:</strong> ${d.dx}<br/>
                            <strong>Sexo:</strong> ${d.sex}<br/>
                            <strong>TDAH:</strong> ${d.tdah}<br/>
                            <strong>Escala:</strong> ${d.escala}<br/>
                            <strong>Promedio:</strong> ${d.score.toFixed(1)} pts
                        `)
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 28) + "px");
                    })
                    .on("mousemove", (event) => {
                        tooltip.style("left", (event.pageX + 10) + "px")
                               .style("top", (event.pageY - 28) + "px");
                    })
                    .on("mouseout", () => {
                        tooltip.transition().duration(500).style("opacity", 0);
                    });
            }
        });

        g.append("g")
            .attr("transform", `translate(0, ${height})`)
            .call(d3.axisBottom(xScale));

        if (dxIdx === 0) {
            g.append("g").call(d3.axisLeft(yScale));
        } else {
            g.append("g").call(d3.axisLeft(yScale).tickSize(0).tickFormat(""));
        }
    });
}

// ----------------------------------------------------
// CHART 8: Scatter Grid (Multivariate Master Dashboard)
// 08_Master_Dashboard_Multivariante.csv
// ----------------------------------------------------
function drawChart8(data, container, legendEl) {
    const { width, height, margin } = getDimensions(container);

    legendEl.html(`
        <div class="legend-item"><div class="legend-color" style="background:#ff9f1c"></div><span>Usa Medicación</span></div>
        <div class="legend-item"><div class="legend-color" style="background:#00f5d4"></div><span>Sin Medicar</span></div>
        <div class="legend-item"><div class="legend-color" style="background:gray"></div><span>Desconocido</span></div>
    `);

    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const tooltip = createTooltip();

    data.forEach(d => {
        d.fiq = +d.fiq;
        d.ados_2_severity_total = +d.ados_2_severity_total;
    });

    const sexTypes = ["Masculino", "Femenino"];
    const cellWidth = width;
    const cellHeight = (height - 30) / 2;

    const xScale = d3.scaleLinear()
        .domain([40, 150])
        .range([0, cellWidth]);

    const yScale = d3.scaleLinear()
        .domain([0, 11])
        .range([cellHeight, 0]);

    sexTypes.forEach((sex, rIdx) => {
        const g = svg.append("g")
            .attr("transform", `translate(0, ${rIdx * (cellHeight + 30)})`);

        const cellData = data.filter(d => d.sex_label === sex);

        g.append("text")
            .attr("x", cellWidth - 10)
            .attr("y", 20)
            .attr("text-anchor", "end")
            .style("fill", "#fff")
            .style("font-size", "11px")
            .style("font-weight", "600")
            .text(`Sexo: ${sex}`);

        g.append("g")
            .attr("class", "grid-line")
            .call(d3.axisLeft(yScale).ticks(5).tickSize(-cellWidth).tickFormat(""));

        g.selectAll(".dot")
            .data(cellData)
            .enter().append("circle")
            .attr("class", "dot")
            .attr("cx", d => xScale(d.fiq))
            .attr("cy", d => yScale(d.ados_2_severity_total + (Math.random() - 0.5) * 0.2))
            .attr("r", 3.5)
            .attr("fill", d => {
                if (d.med_label === "Sí") return "#ff9f1c";
                if (d.med_label === "No") return "#00f5d4";
                return "gray";
            })
            .attr("opacity", 0.6)
            .on("mouseover", (event, d) => {
                tooltip.transition().duration(200).style("opacity", .9);
                tooltip.html(`
                    <strong>ID:</strong> ${d.sub_id}<br/>
                    <strong>Coef. Intelectual (FIQ):</strong> ${d.fiq} pts<br/>
                    <strong>Severidad (ADOS):</strong> ${d.ados_2_severity_total}<br/>
                    <strong>Medicación:</strong> ${d.med_label}
                `)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
            })
            .on("mousemove", (event) => {
                tooltip.style("left", (event.pageX + 10) + "px")
                       .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", () => {
                tooltip.transition().duration(500).style("opacity", 0);
            });

        const sortedPoints = cellData.map(d => ({ x: d.fiq, y: d.ados_2_severity_total }))
                                     .sort((a,b) => a.x - b.x);

        if (sortedPoints.length > 5) {
            const windowSize = Math.floor(sortedPoints.length * 0.3);
            const curvePoints = [];
            
            for (let i = 0; i < sortedPoints.length; i++) {
                const start = Math.max(0, i - Math.floor(windowSize / 2));
                const end = Math.min(sortedPoints.length, start + windowSize);
                const subset = sortedPoints.slice(start, end);
                const avgX = d3.mean(subset, d => d.x);
                const avgY = d3.mean(subset, d => d.y);
                curvePoints.push([avgX, avgY]);
            }

            const splineGen = d3.line()
                .x(d => xScale(d[0]))
                .y(d => yScale(d[1]))
                .curve(d3.curveBasis);

            g.append("path")
                .datum(curvePoints)
                .attr("fill", "none")
                .attr("stroke", "#fff")
                .attr("stroke-width", 2)
                .attr("stroke-dasharray", "4 4")
                .attr("d", splineGen);
        }

        g.append("g").call(d3.axisLeft(yScale).ticks(5));

        if (rIdx === 1) {
            g.append("g")
                .attr("transform", `translate(0, ${cellHeight})`)
                .call(d3.axisBottom(xScale));
        } else {
            g.append("g")
                .attr("transform", `translate(0, ${cellHeight})`)
                .call(d3.axisBottom(xScale).tickSize(0).tickFormat(""));
        }
    });
}

// ----------------------------------------------------
// CHART 10: Bubble Chart (SRS vs CSI TDAH)
// 10_Burbujas_RespuestaSocial_SRS_vs_CSI_TDAH.csv
// ----------------------------------------------------
function drawChart10(data, container, legendEl) {
    const { width, height, margin } = getDimensions(container);

    legendEl.html(`
        <div class="legend-item"><div class="legend-color" style="background:#8338ec"></div><span>Femenino</span></div>
        <div class="legend-item"><div class="legend-color" style="background:#ff9f1c"></div><span>Masculino</span></div>
        <div class="legend-item"><span>El tamaño representa el rango de edad (mayor burbuja = mayor edad)</span></div>
    `);

    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const tooltip = createTooltip();

    data.forEach(d => {
        d.srs_total_t = +d.srs_total_t;
        d.csi_adhd_c_severity = +d.csi_adhd_c_severity;
    });

    const xScale = d3.scaleLinear()
        .domain([30, 120])
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain([-2, 40])
        .range([height, 0]);

    const ageSizeScale = d3.scaleOrdinal()
        .domain(["6-12", "13-18", "19-25", "26-40", ">40"])
        .range([5, 8, 12, 16, 20]);

    svg.append("g")
        .attr("class", "grid-line")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(xScale).ticks(6).tickSize(-height).tickFormat(""));
    svg.append("g")
        .attr("class", "grid-line")
        .call(d3.axisLeft(yScale).ticks(6).tickSize(-width).tickFormat(""));

    svg.selectAll(".bubble")
        .data(data)
        .enter().append("circle")
        .attr("class", "bubble")
        .attr("cx", d => xScale(d.srs_total_t))
        .attr("cy", d => yScale(d.csi_adhd_c_severity))
        .attr("r", d => ageSizeScale(d.age_bin) || 6)
        .attr("fill", d => d.sex_label === "Femenino" ? "#8338ec" : "#ff9f1c")
        .attr("opacity", 0.7)
        .attr("stroke", "#fff")
        .attr("stroke-width", 1)
        .on("mouseover", (event, d) => {
            tooltip.transition().duration(200).style("opacity", .9);
            tooltip.html(`
                <strong>ID:</strong> ${d.sub_id}<br/>
                <strong>Diagnóstico:</strong> ${d.dx_label}<br/>
                <strong>Sexo:</strong> ${d.sex_label}<br/>
                <strong>Rango Edad:</strong> ${d.age_bin}<br/>
                <strong>Respuesta Social (SRS T):</strong> ${d.srs_total_t}<br/>
                <strong>Severidad TDAH (CSI):</strong> ${d.csi_adhd_c_severity}
            `)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
        })
        .on("mousemove", (event) => {
            tooltip.style("left", (event.pageX + 10) + "px")
                   .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", () => {
            tooltip.transition().duration(500).style("opacity", 0);
        });

    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(xScale));

    svg.append("g")
        .call(d3.axisLeft(yScale));

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + 35)
        .attr("text-anchor", "middle")
        .style("fill", "#fff")
        .text("Respuesta Social (SRS Total T-score)");

    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -35)
        .attr("x", -height / 2)
        .attr("text-anchor", "middle")
        .style("fill", "#fff")
        .text("Severidad TDAH Combinado (CSI-4)");
}


