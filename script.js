
const SUPABASE_URL = "https://kvhfbvpukhpcoscqszuc.supabase.co/rest/v1/";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_zbyrw6sTfnU7rOQSzr_CRQ_RS0SvUOE";

const db = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);

const servicesList = document.getElementById("servicesList");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const sortSelect = document.getElementById("sortSelect");
const serviceCount = document.getElementById("serviceCount");

const serviceForm = document.getElementById("serviceForm");
const submitButton = document.getElementById("submitButton");
const formMessage = document.getElementById("formMessage");

let services = [];

const categoryIcons = {
    "Фотограф": "📸",
    "Відеограф": "🎥",
    "Декоратор": "🌸",
    "Ведучий": "🎤",
    "Флорист": "💐",
    "Музика": "🎵",
    "Інше": "💍"
};

// Отримання послуг із Supabase
async function loadServices() {
    servicesList.replaceChildren();

    const loadingMessage = document.createElement("p");
    loadingMessage.className = "message";
    loadingMessage.textContent = "Завантаження послуг...";
    servicesList.appendChild(loadingMessage);

    const { data, error } = await db
        .from("wedding_services")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Помилка отримання даних:", error);
        servicesList.replaceChildren();

        const errorMessage = document.createElement("p");
        errorMessage.className = "message error";
        errorMessage.textContent =
            "Не вдалося завантажити послуги. Перевірте підключення до бази даних.";

        servicesList.appendChild(errorMessage);
        serviceCount.textContent = "";
        return;
    }

    services = data || [];

    updateCategoryFilter();
    renderServices();
}

// Оновлення списку категорій
function updateCategoryFilter() {
    const selectedCategory = categoryFilter.value;

    const categories = [...new Set(
        services.map(service => service.category).filter(Boolean)
    )].sort();

    categoryFilter.replaceChildren();

    const allOption = document.createElement("option");
    allOption.value = "";
    allOption.textContent = "Усі категорії";
    categoryFilter.appendChild(allOption);

    categories.forEach(category => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        categoryFilter.appendChild(option);
    });

    categoryFilter.value = categories.includes(selectedCategory)
        ? selectedCategory
        : "";
}

// Відображення послуг
function renderServices() {
    servicesList.replaceChildren();

    const searchText = searchInput.value.trim().toLowerCase();
    const selectedCategory = categoryFilter.value;
    const sortValue = sortSelect.value;

    let filteredServices = services.filter(service => {
        const matchesSearch =
            service.name.toLowerCase().includes(searchText) ||
            (service.description || "").toLowerCase().includes(searchText) ||
            (service.city || "").toLowerCase().includes(searchText);

        const matchesCategory =
            !selectedCategory || service.category === selectedCategory;

        return matchesSearch && matchesCategory;
    });

    // Сортування
    if (sortValue === "name-asc") {
        filteredServices.sort((a, b) =>
            a.name.localeCompare(b.name, "uk")
        );
    } else if (sortValue === "price-asc") {
        filteredServices.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sortValue === "price-desc") {
        filteredServices.sort((a, b) => Number(b.price) - Number(a.price));
    }

    serviceCount.textContent =
        `Знайдено послуг: ${filteredServices.length}`;

    if (filteredServices.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.className = "message";
        emptyMessage.textContent = services.length === 0
            ? "У каталозі поки немає послуг."
            : "За вашим запитом нічого не знайдено.";

        servicesList.appendChild(emptyMessage);
        return;
    }

    filteredServices.forEach(service => {
        const card = document.createElement("article");
        card.className = "service-card";

        const icon = document.createElement("div");
        icon.className = "service-icon";
        icon.textContent = categoryIcons[service.category] || "💍";

        const title = document.createElement("h3");
        title.textContent = service.name;

        const category = document.createElement("span");
        category.className = "category";
        category.textContent = service.category;

        const description = document.createElement("p");
        description.className = "description";
        description.textContent = service.description || "Опис відсутній.";

        const city = document.createElement("p");
        city.className = "city";
        city.textContent = `📍 ${service.city || "Місто не вказано"}`;

        const price = document.createElement("p");
        price.className = "price";
        price.textContent =
            `${Number(service.price).toLocaleString("uk-UA")} грн`;

        card.append(icon, title, category, description, city, price);
        servicesList.appendChild(card);
    });
}

// Пошук
searchInput.addEventListener("input", renderServices);

// Фільтрація
categoryFilter.addEventListener("change", renderServices);

// Сортування
sortSelect.addEventListener("change", renderServices);

// Додавання нової послуги
serviceForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const name = document.getElementById("serviceName").value.trim();
    const category = document.getElementById("serviceCategory").value;
    const price = Number(document.getElementById("servicePrice").value);
    const city = document.getElementById("serviceCity").value.trim();
    const description = document.getElementById("serviceDescription").value.trim();

    formMessage.textContent = "";
    formMessage.className = "form-message";

    // Перевірка обов'язкових полів
    if (!name || !category || !document.getElementById("servicePrice").value) {
        showFormMessage("Заповніть усі обов'язкові поля.", "error");
        return;
    }

    if (name.length > 100 || category.length > 50 ||
        city.length > 100 || description.length > 500) {
        showFormMessage("Перевищено допустиму довжину введених даних.", "error");
        return;
    }

    if (!Number.isFinite(price) || price < 0 || price > 10000000) {
        showFormMessage("Введіть коректну вартість послуги.", "error");
        return;
    }

    // Блокування кнопки під час запиту
    submitButton.disabled = true;
    submitButton.textContent = "Додавання...";

    try {
        const { error } = await db
            .from("wedding_services")
            .insert([{
                name,
                category,
                price,
                city: city || null,
                description: description || null
            }]);

        if (error) {
            throw error;
        }

        showFormMessage("Послугу успішно додано!", "success");

        serviceForm.reset();

        searchInput.value = "";
        categoryFilter.value = "";
        sortSelect.value = "default";

        // Оновлення каталогу без перезавантаження
        await loadServices();

    } catch (error) {
        console.error("Помилка додавання:", error);

        showFormMessage(
            "Не вдалося додати послугу. Перевірте права доступу та підключення.",
            "error"
        );
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Додати послугу";
    }
});

// Повідомлення користувачу
function showFormMessage(message, type) {
    formMessage.textContent = message;
    formMessage.className = `form-message ${type}`;
}

// Початкове завантаження
loadServices();
