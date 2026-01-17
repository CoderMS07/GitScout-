const API_URL = "https://api.github.com/users/";
let currentRepos = [];
let myChart = null;
let isExpanded = false;

// --- Theme Toggle ---
const themeBtn = document.getElementById("themeToggle");
const html = document.documentElement;
const icon = themeBtn.querySelector("i");

if (localStorage.getItem("theme") === "light") {
    html.setAttribute("data-theme", "light");
    icon.classList.replace("fa-moon", "fa-sun");
}

themeBtn.addEventListener("click", () => {
    const currentTheme = html.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    html.setAttribute("data-theme", newTheme);
    icon.classList.replace(newTheme === "dark" ? "fa-sun" : "fa-moon", newTheme === "dark" ? "fa-moon" : "fa-sun");
    localStorage.setItem("theme", newTheme);
});

document.getElementById("usernameInput").addEventListener("keyup", (e) => {
    if (e.key === "Enter") getProfile();
});

async function getProfile() {
    const username = document.getElementById("usernameInput").value.trim();
    const mainContent = document.getElementById("mainContent");
    const loader = document.getElementById("loader");
    const errorMsg = document.getElementById("errorMsg");
    const hero = document.querySelector(".hero");

    if (!username) return;

    isExpanded = false;
    mainContent.classList.add("hidden");
    errorMsg.classList.add("hidden");
    loader.classList.remove("hidden");
    
    if(hero) hero.style.display = "none";

    try {
        const userRes = await fetch(API_URL + username);
        if (!userRes.ok) throw new Error("User not found or API limit reached");
        const user = await userRes.json();

        const repoRes = await fetch(user.repos_url + "?per_page=100&sort=updated");
        const repos = await repoRes.json();
        
        currentRepos = repos;

        renderProfile(user);
        renderRepos(repos);
        renderChart(repos);

        loader.classList.add("hidden");
        mainContent.classList.remove("hidden");

    } catch (err) {
        loader.classList.add("hidden");
        errorMsg.textContent = err.message;
        errorMsg.classList.remove("hidden");
        if(hero) hero.style.display = "block";
    }
}

function renderProfile(user) {
    const profileDiv = document.getElementById("profileData");
    const createdDate = new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    
    profileDiv.innerHTML = `
        <div class="profile-card">
            <img src="${user.avatar_url}" class="profile-img" alt="${user.login}">
            <h2 class="profile-name">${user.name || user.login}</h2>
            <span class="profile-login">@${user.login}</span>
            <p class="profile-bio">${user.bio || "No bio available."}</p>
            
            <div class="social-links">
                <span><i class="fas fa-users"></i> ${user.followers} Followers · ${user.following} Following</span>
                ${user.location ? `<span><i class="fas fa-map-marker-alt"></i> ${user.location}</span>` : ''}
                ${user.blog ? `<span><i class="fas fa-link"></i> <a href="${user.blog.startsWith('http') ? user.blog : 'https://'+user.blog}" target="_blank" style="color:var(--accent); text-decoration:none">Website</a></span>` : ''}
                <span><i class="far fa-calendar-alt"></i> Joined ${createdDate}</span>
            </div>
            
            <a href="${user.html_url}" target="_blank" style="
                display:block; margin-top:20px; padding:10px; background:var(--btn-bg); 
                color:white; text-decoration:none; border-radius:6px; font-weight:bold;">
                View on GitHub
            </a>
        </div>
    `;
}

function renderRepos(repos) {
    const grid = document.getElementById("reposGrid");
    const repoCountLabel = document.getElementById("repoCount");
    
    repoCountLabel.innerText = repos.length;
    grid.innerHTML = "";

    if(repos.length === 0) {
        grid.innerHTML = "<p style='color:var(--text-muted); grid-column:1/-1; text-align:center;'>No public repositories found.</p>";
        return;
    }

    const filterText = document.getElementById("filterInput").value;
    const shouldLimit = !isExpanded && filterText === "" && repos.length > 10;
    const displayRepos = shouldLimit ? repos.slice(0, 10) : repos;

    displayRepos.forEach((repo, index) => {
        const card = document.createElement("div");
        card.className = "repo-card";
        card.style.animation = `fadeIn 0.5s ease forwards ${index * 0.05}s`;
        card.style.opacity = "0"; 
        
        card.onclick = () => window.open(repo.html_url, "_blank");
        
        card.innerHTML = `
            <div class="repo-title">
                <i class="fas fa-book-bookmark"></i> ${repo.name}
            </div>
            <p class="repo-desc">${repo.description || "No description provided."}</p>
            <div class="repo-stats">
                ${repo.language ? `<span><i class="fas fa-circle" style="font-size:10px;"></i> ${repo.language}</span>` : ''}
                <span><i class="far fa-star"></i> ${repo.stargazers_count}</span>
                <span><i class="fas fa-code-branch"></i> ${repo.forks_count}</span>
            </div>
        `;
        grid.appendChild(card);
    });

    if (shouldLimit) {
        const button = document.createElement("button");
        button.className = "show-more-btn";
        button.innerHTML = `See More Repositories (${repos.length - 10} more) <i class="fas fa-chevron-down"></i>`;
        button.onclick = () => {
            isExpanded = true;
            renderRepos(currentRepos);
        };
        grid.appendChild(button);
    }
}

function filterRepos() {
    const query = document.getElementById("filterInput").value.toLowerCase();
    const filtered = currentRepos.filter(repo => repo.name.toLowerCase().includes(query));
    renderRepos(filtered);
}

function renderChart(repos) {
    const ctx = document.getElementById('langChart').getContext('2d');
    
    const languages = {};
    repos.forEach(repo => {
        if(repo.language) {
            languages[repo.language] = (languages[repo.language] || 0) + 1;
        }
    });

    if (Object.keys(languages).length === 0) {
        document.querySelector(".chart-container").style.display = "none";
        return;
    } else {
        document.querySelector(".chart-container").style.display = "flex";
    }

    if (myChart) myChart.destroy();

    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(languages),
            datasets: [{
                data: Object.values(languages),
                backgroundColor: [
                    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'
                ],
                borderWidth: 1,
                borderColor: getComputedStyle(document.documentElement).getPropertyValue('--bg-card')
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, 
            plugins: {
                legend: { 
                    position: 'bottom', 
                    labels: { 
                        color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted'),
                        padding: 20 
                    } 
                },
                title: { 
                    display: true, 
                    text: 'Top Languages', 
                    color: getComputedStyle(document.documentElement).getPropertyValue('--text-main'),
                    font: { size: 16 }
                }
            }
        }
    });
}