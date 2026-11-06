"use strict";

const STORAGE_KEYS = {
  expenses: "rapiuang.expenses.v1",
  budgets: "rapiuang.budgets.v1",
};

const dateInput = document.querySelector("#selected-date");
const budgetForm = document.querySelector("#budget-form");
const budgetInput = document.querySelector("#budget-input");
const expenseForm = document.querySelector("#expense-form");
const expenseName = document.querySelector("#expense-name");
const expenseCategory = document.querySelector("#expense-category");
const expenseAmount = document.querySelector("#expense-amount");
const expenseList = document.querySelector("#expense-list");
const emptyState = document.querySelector("#empty-state");
const message = document.querySelector("#app-message");
const submitExpense = document.querySelector("#submit-expense");
const cancelEdit = document.querySelector("#cancel-edit");

const formatCurrency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function readStorage(key, fallback, isValid) {
  const storedValue = localStorage.getItem(key);
  if (storedValue === null) return fallback;

  const parsedValue = JSON.parse(storedValue);
  if (!isValid(parsedValue)) {
    throw new Error("Format data tersimpan tidak sesuai.");
  }
  return parsedValue;
}

function isExpenseList(value) {
  return Array.isArray(value) && value.every((expense) =>
    expense &&
    typeof expense.id === "string" &&
    typeof expense.name === "string" &&
    typeof expense.category === "string" &&
    Number.isFinite(expense.amount) &&
    expense.amount > 0 &&
    /^\d{4}-\d{2}-\d{2}$/.test(expense.date)
  );
}

function isBudgetMap(value) {
  return value && typeof value === "object" && !Array.isArray(value) &&
    Object.entries(value).every(([date, amount]) =>
      /^\d{4}-\d{2}-\d{2}$/.test(date) &&
      Number.isFinite(amount) &&
      amount >= 0
    );
}

let expenses;
let budgets;
let editingId = null;

function showMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle("error", isError);
}

function saveExpenses() {
  localStorage.setItem(STORAGE_KEYS.expenses, JSON.stringify(expenses));
}

function saveBudgets() {
  localStorage.setItem(STORAGE_KEYS.budgets, JSON.stringify(budgets));
}

function selectedExpenses() {
  return expenses
    .filter((expense) => expense.date === dateInput.value)
    .sort((a, b) => b.createdAt - a.createdAt);
}

function displaySelectedDate() {
  const date = new Date(`${dateInput.value}T00:00:00`);
  document.querySelector("#record-date").textContent =
    new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(date);
}

function render() {
  const budget = budgets[dateInput.value] || 0;
  const todayExpenses = selectedExpenses();
  const total = todayExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const remaining = budget - total;

  document.querySelector("#budget-value").textContent = formatCurrency.format(budget);
  document.querySelector("#expense-value").textContent = formatCurrency.format(total);
  document.querySelector("#expense-count").textContent = `${todayExpenses.length} transaksi`;
  document.querySelector("#balance-value").textContent = formatCurrency.format(remaining);
  document.querySelector("#balance-value").classList.toggle("over-budget", remaining < 0);
  document.querySelector("#balance-note").textContent = budget === 0
    ? "Atur anggaran untuk mulai"
    : remaining < 0
      ? `Melebihi anggaran ${formatCurrency.format(Math.abs(remaining))}`
      : "Masih tersedia untuk dibelanjakan";
  budgetInput.value = budgets[dateInput.value] ?? "";
  displaySelectedDate();

  expenseList.replaceChildren();
  emptyState.hidden = todayExpenses.length > 0;

  for (const expense of todayExpenses) {
    const row = document.createElement("tr");
    const nameCell = document.createElement("td");
    const categoryCell = document.createElement("td");
    const amountCell = document.createElement("td");
    const actionsCell = document.createElement("td");
    const actions = document.createElement("div");
    const editButton = document.createElement("button");
    const deleteButton = document.createElement("button");
    const category = document.createElement("span");

    nameCell.className = "expense-title";
    nameCell.textContent = expense.name;
    category.className = "category-pill";
    category.textContent = expense.category;
    categoryCell.append(category);
    amountCell.className = "amount-cell";
    amountCell.textContent = formatCurrency.format(expense.amount);
    actions.className = "row-actions";
    editButton.type = "button";
    editButton.className = "icon-button";
    editButton.textContent = "Edit";
    editButton.setAttribute("aria-label", `Edit ${expense.name}`);
    editButton.addEventListener("click", () => beginEdit(expense.id));
    deleteButton.type = "button";
    deleteButton.className = "icon-button delete";
    deleteButton.textContent = "Hapus";
    deleteButton.setAttribute("aria-label", `Hapus ${expense.name}`);
    deleteButton.addEventListener("click", () => deleteExpense(expense.id));

    actions.append(editButton, deleteButton);
    actionsCell.append(actions);
    row.append(nameCell, categoryCell, amountCell, actionsCell);
    expenseList.append(row);
  }
}

function resetExpenseForm() {
  editingId = null;
  expenseForm.reset();
  document.querySelector("#form-heading").textContent = "Ada belanja apa?";
  submitExpense.textContent = "＋ Tambah pengeluaran";
  cancelEdit.hidden = true;
}

function beginEdit(id) {
  const expense = expenses.find((item) => item.id === id);
  if (!expense) {
    showMessage("Pengeluaran tidak ditemukan.", true);
    return;
  }

  editingId = id;
  expenseName.value = expense.name;
  expenseCategory.value = expense.category;
  expenseAmount.value = expense.amount;
  document.querySelector("#form-heading").textContent = "Ubah pengeluaran";
  submitExpense.textContent = "Simpan perubahan";
  cancelEdit.hidden = false;
  expenseName.focus();
}

function deleteExpense(id) {
  const expense = expenses.find((item) => item.id === id);
  if (!expense || !window.confirm(`Hapus pengeluaran "${expense.name}"?`)) return;

  const previousExpenses = expenses;
  expenses = expenses.filter((item) => item.id !== id);
  try {
    saveExpenses();
    if (editingId === id) resetExpenseForm();
    render();
    showMessage("Pengeluaran berhasil dihapus.");
  } catch (error) {
    expenses = previousExpenses;
    showMessage(`Gagal menyimpan perubahan: ${error.message}`, true);
  }
}

dateInput.value = localDateString();

try {
  expenses = readStorage(STORAGE_KEYS.expenses, [], isExpenseList);
  budgets = readStorage(STORAGE_KEYS.budgets, {}, isBudgetMap);
  render();
} catch (error) {
  expenses = [];
  budgets = {};
  render();
  showMessage(`Data tidak dapat dibaca: ${error.message}`, true);
}

dateInput.addEventListener("change", () => {
  resetExpenseForm();
  render();
  showMessage("");
});

budgetForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const amount = Number(budgetInput.value);
  if (!Number.isSafeInteger(amount) || amount < 0) {
    showMessage("Masukkan anggaran berupa angka nol atau lebih.", true);
    return;
  }

  const previousBudgets = budgets;
  budgets = { ...budgets, [dateInput.value]: amount };
  try {
    saveBudgets();
    render();
    showMessage("Anggaran berhasil disimpan.");
  } catch (error) {
    budgets = previousBudgets;
    showMessage(`Gagal menyimpan anggaran: ${error.message}`, true);
  }
});

expenseForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = expenseName.value.trim();
  const amount = Number(expenseAmount.value);
  if (!name || !Number.isSafeInteger(amount) || amount <= 0) {
    showMessage("Isi nama dan jumlah pengeluaran dengan benar.", true);
    return;
  }

  const previousExpenses = expenses;
  const wasEditing = Boolean(editingId);
  if (wasEditing) {
    expenses = expenses.map((expense) => expense.id === editingId
      ? { ...expense, name, category: expenseCategory.value, amount }
      : expense);
  } else {
    expenses = [...expenses, {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name,
      category: expenseCategory.value,
      amount,
      date: dateInput.value,
      createdAt: Date.now(),
    }];
  }

  try {
    saveExpenses();
    resetExpenseForm();
    render();
    showMessage(wasEditing ? "Pengeluaran berhasil diperbarui." : "Pengeluaran berhasil ditambahkan.");
  } catch (error) {
    expenses = previousExpenses;
    showMessage(`Gagal menyimpan pengeluaran: ${error.message}`, true);
  }
});

cancelEdit.addEventListener("click", () => {
  resetExpenseForm();
  showMessage("");
});
