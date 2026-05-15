document.addEventListener('DOMContentLoaded', () => {
    initCounters();
    initScrollReveal();
    initDarkMode();
    
    // Scrollytelling Setup
    initScrollyMap();
    initScrollyChart();
});

function initCounters() {
    const counters = document.querySelectorAll('.counter-animate');
    const speed = 200;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = entry.target;
                const targetValue = parseInt(target.getAttribute('data-target'));
                const suffix = target.getAttribute('data-suffix') || '';
                let count = 0;
                
                const updateCount = () => {
                    const inc = targetValue / speed;
                    if(count < targetValue) {
                        count += inc;
                        target.innerText = Math.ceil(count) + suffix;
                        setTimeout(updateCount, 1);
                    } else {
                        target.innerText = targetValue + suffix;
                    }
                }
                updateCount();
                observer.unobserve(target);
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(counter => observer.observe(counter));
}

function initScrollReveal() {
    const elements = document.querySelectorAll('.reveal-on-scroll');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('opacity-100', 'translate-y-0');
                entry.target.classList.remove('opacity-0', 'translate-y-8');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    elements.forEach(el => {
        el.classList.add('transition-all', 'duration-700', 'opacity-0', 'translate-y-8');
        observer.observe(el);
    });
}

function initDarkMode() {
    const html = document.documentElement;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        html.classList.add('dark');
        html.classList.remove('light');
    } else {
        html.classList.add('light');
        html.classList.remove('dark');
    }
}

// --- D3 & SCROLLAMA: SECTION 2 (MAP ABSTRACT) ---
function initScrollyMap() {
    const container = document.getElementById('d3-map-graphic');
    if (!container) return;
    
    // Abstract map data (bubble packing approach)
    const data = {
        name: "Europa",
        children: [
            {name: "Portugal", value: 45, color: "#2563EB", x: 30, y: 70}, // Corporate blue
            {name: "UK", value: 20, color: "#3b82f6", x: 40, y: 30},
            {name: "Francia", value: 15, color: "#60a5fa", x: 50, y: 50},
            {name: "España", value: 10, color: "#93c5fd", x: 40, y: 70},
            {name: "Otros", value: 10, color: "#e5eeff", x: 60, y: 40}
        ]
    };

    const width = container.clientWidth;
    const height = container.clientHeight;
    
    const svg = d3.select("#d3-map-graphic")
        .append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", [0, 0, 100, 100])
        .style("max-width", "100%")
        .style("height", "auto");

    // Base state (invisible bubbles)
    const bubbles = svg.selectAll("g")
        .data(data.children)
        .join("g")
        .attr("transform", d => `translate(${d.x}, ${d.y})`);

    bubbles.append("circle")
        .attr("r", 0) // Start at 0 radius
        .attr("fill", d => d.color)
        .attr("opacity", 0.8)
        .attr("class", "map-bubble");

    bubbles.append("text")
        .text(d => d.name)
        .attr("text-anchor", "middle")
        .attr("dy", "0.3em")
        .style("font-size", "0px") // Hide text initially
        .style("fill", d => d.name === "Otros" ? "#131b2e" : "white")
        .style("font-weight", "600")
        .style("font-family", "Source Sans 3, sans-serif")
        .attr("class", "map-label");

    // Scrollama Setup
    const scroller = scrollama();
    scroller.setup({
        step: '#scrolly-map .step',
        offset: 0.5,
        debug: false
    }).onStepEnter(response => {
        // response = { element, index, direction }
        if (response.index === 0) {
            // Step 1: Show bubbles based on value
            svg.selectAll(".map-bubble")
                .transition()
                .duration(1000)
                .attr("r", d => d.value / 2);
                
            svg.selectAll(".map-label")
                .transition()
                .duration(1000)
                .style("font-size", d => (d.value / 4) + "px");
        } else if (response.index === 1) {
            // Step 2: Highlight Portugal (Resort vs City abstract visual shift)
            svg.selectAll(".map-bubble")
                .transition()
                .duration(1000)
                .attr("fill", d => d.name === "Portugal" ? "#0D9488" : "#d3e4fe") // Highlight PT in Teal
                .attr("r", d => d.name === "Portugal" ? (d.value / 2) + 5 : d.value / 2.5);
                
            svg.selectAll(".map-label")
                .transition()
                .duration(1000)
                .style("fill", d => d.name === "Portugal" ? "white" : "#45464d");
        }
    });
    
    window.addEventListener("resize", scroller.resize);
}

// --- D3 & SCROLLAMA: SECTION 5 (BAR CHART) ---
function initScrollyChart() {
    const container = document.getElementById('d3-chart-container');
    if (!container) return;

    const data = [
        { market: 'Portugal', cancellation: 45, class: 'bg-corporate-blue text-white' },
        { market: 'UK', cancellation: 20, class: 'bg-corporate-blue/80 text-white' },
        { market: 'Francia', cancellation: 15, class: 'bg-corporate-blue/60 text-white' },
        { market: 'España', cancellation: 25, class: 'bg-corporate-blue/40 text-deep-navy' }
    ];

    const margin = {top: 20, right: 20, bottom: 40, left: 40};
    const width = container.clientWidth - margin.left - margin.right;
    const height = container.clientHeight - margin.top - margin.bottom;

    const svg = d3.select("#d3-chart-container")
        .append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        // Responsive viewBox
        .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // X axis
    const x = d3.scaleBand()
        .range([0, width])
        .domain(data.map(d => d.market))
        .padding(0.2);
    
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .style("font-family", "Source Sans 3, sans-serif")
        .style("font-weight", "600")
        .style("font-size", "14px");

    // Add Y axis
    const y = d3.scaleLinear()
        .domain([0, 60])
        .range([height, 0]);
        
    svg.append("g")
        .call(d3.axisLeft(y).ticks(5).tickFormat(d => d + "%"))
        .style("font-family", "Source Sans 3, sans-serif");

    // Bars base state (height 0)
    const bars = svg.selectAll("mybar")
        .data(data)
        .join("rect")
        .attr("class", "chart-bar")
        .attr("x", d => x(d.market))
        .attr("width", x.bandwidth())
        .attr("fill", "#2563EB")
        .attr("rx", 4) // rounded corners
        .attr("y", y(0))
        .attr("height", 0);

    // Scrollama Setup
    const scroller = scrollama();
    scroller.setup({
        step: '#scrolly-chart .step',
        offset: 0.6,
        debug: false
    }).onStepEnter(response => {
        if (response.index === 0) {
            // Step 1: Animate bars up
            bars.transition()
                .duration(800)
                .attr("y", d => y(d.cancellation))
                .attr("height", d => height - y(d.cancellation))
                .attr("fill", "#2563EB");
        } else if (response.index === 1) {
            // Step 2: Highlight low cancellation markets
            bars.transition()
                .duration(800)
                .attr("fill", d => (d.market === "UK" || d.market === "Francia") ? "#0D9488" : "#dce9ff"); // Highlight UK/FR
        } else if (response.index === 2) {
            // Step 3: Shift focus to high cancellation markets
            bars.transition()
                .duration(800)
                .attr("fill", d => (d.market === "Portugal" || d.market === "España") ? "#ba1a1a" : "#dce9ff"); // Highlight PT/ES in Error color
        }
    });

    window.addEventListener("resize", () => {
        // Note: For a fully robust D3 responsive chart, redraw logic is needed here.
        // The viewBox handles basic scaling.
        scroller.resize();
    });
}
