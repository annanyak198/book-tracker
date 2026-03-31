// ============================================================
//  BOOK TRACKER - app.js
//  Works for: index.html, books.html, add-book.html, stats.html, goals.html
// ============================================================


// ============================================================
// 1. STORAGE HELPERS
// ============================================================

function getBooks() {
    try {
        const data = localStorage.getItem('books');
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('Error reading books:', e);
        return [];
    }
}

function saveBooks(books) {
    try {
        localStorage.setItem('books', JSON.stringify(books));
        return true;
    } catch (e) {
        console.error('Error saving books:', e);
        return false;
    }
}

function getLogs() {
    try {
        const data = localStorage.getItem('readingLogs');
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('Error reading logs:', e);
        return [];
    }
}

function saveLogs(logs) {
    try {
        localStorage.setItem('readingLogs', JSON.stringify(logs));
        return true;
    } catch (e) {
        console.error('Error saving logs:', e);
        return false;
    }
}

function getGoals() {
    try {
        const data = localStorage.getItem('readingGoals');
        return data ? JSON.parse(data) : { monthly: 0, yearly: 0 };
    } catch (e) {
        console.error('Error reading goals:', e);
        return { monthly: 0, yearly: 0 };
    }
}

function saveGoals(goals) {
    try {
        localStorage.setItem('readingGoals', JSON.stringify(goals));
        return true;
    } catch (e) {
        console.error('Error saving goals:', e);
        return false;
    }
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function promptForBookRating(bookTitle) {
    const input = prompt(`You finished "${bookTitle}"! Give it a rating from 1 to 5, or leave blank to skip.`);

    if (input === null || input.trim() === '') {
        return 0;
    }

    const rating = parseInt(input, 10);

    if (isNaN(rating) || rating < 1 || rating > 5) {
        alert('Please enter a whole number from 1 to 5.');
        return null;
    }

    return rating;
}


// ============================================================
// 2. FIX OLD FINISHED BOOKS
// ============================================================

function fixFinishedBooks() {
    const books = getBooks();
    const logs  = getLogs();
    const today = new Date().toISOString().split('T')[0];
    let changed = false;

    books.forEach(book => {
        if (book.status === 'finished') {

            if (!book.currentPage || book.currentPage < book.totalPages) {
                book.currentPage = book.totalPages;
                changed = true;
            }

            if (!book.finishDate) {
                book.finishDate = today;
                changed = true;
            }

            const hasLog = logs.some(l => l.bookId === book.id);
            if (!hasLog) {
                logs.push({
                    id:        Date.now() + Math.floor(Math.random() * 10000),
                    bookId:    book.id,
                    date:      book.finishDate || today,
                    pagesRead: book.totalPages
                });
                changed = true;
            }
        }
    });

    if (changed) {
        saveBooks(books);
        saveLogs(logs);
        console.log('Finished books data fixed!');
    }
}


// ============================================================
// 3. DASHBOARD  (index.html)
// ============================================================

function displayDashboard() {
    console.log('Loading dashboard...');

    const books = getBooks();
    const logs  = getLogs();
    const goals = getGoals();

    const now       = new Date();
    const thisMonth = now.getMonth();
    const thisYear  = now.getFullYear();

    const monthLogs = logs.filter(log => {
        const d = new Date(log.date);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    });

    const totalPagesThisMonth = monthLogs.reduce((sum, log) => sum + (log.pagesRead || 0), 0);

    const uniqueDays     = new Set(monthLogs.map(log => log.date)).size;
    const avgPagesPerDay = uniqueDays > 0
        ? (totalPagesThisMonth / uniqueDays).toFixed(1)
        : 0;

    const readingBooks = books.filter(b => b.status === 'reading');

    const booksFinishedThisMonth = books.filter(b => {
        if (b.status !== 'finished' || !b.finishDate) return false;
        const d = new Date(b.finishDate);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    });

    // update stat cards
    const el = id => document.getElementById(id);
    if (el('totalBooks'))    el('totalBooks').textContent    = readingBooks.length;
    if (el('totalPages'))    el('totalPages').textContent    = totalPagesThisMonth;
    if (el('avgPages'))      el('avgPages').textContent      = avgPagesPerDay;
    if (el('booksFinished')) el('booksFinished').textContent = booksFinishedThisMonth.length;

    // goals progress section
    const goalsDiv = el('goalsProgress');
    if (goalsDiv && (goals.monthly > 0 || goals.yearly > 0)) {
        let html = '<h3>Reading Goals</h3>';
        
        if (goals.monthly > 0) {
            const monthProgress = goals.monthly > 0 ? Math.min(100, Math.round((booksFinishedThisMonth.length / goals.monthly) * 100)) : 0;
            html += `
                <div class="goal-card">
                    <div class="goal-header">
                        <span>Monthly Goal: ${booksFinishedThisMonth.length} / ${goals.monthly} books</span>
                        <span class="goal-percentage">${monthProgress}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width:${monthProgress}%"></div>
                    </div>
                </div>`;
        }

        const booksFinishedThisYear = books.filter(b => {
            if (b.status !== 'finished' || !b.finishDate) return false;
            const d = new Date(b.finishDate);
            return d.getFullYear() === thisYear;
        });

        if (goals.yearly > 0) {
            const yearProgress = goals.yearly > 0 ? Math.min(100, Math.round((booksFinishedThisYear.length / goals.yearly) * 100)) : 0;
            html += `
                <div class="goal-card">
                    <div class="goal-header">
                        <span>Yearly Goal: ${booksFinishedThisYear.length} / ${goals.yearly} books</span>
                        <span class="goal-percentage">${yearProgress}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width:${yearProgress}%"></div>
                    </div>
                </div>`;
        }

        goalsDiv.innerHTML = html;
    } else if (goalsDiv) {
        goalsDiv.innerHTML = '<p>No reading goals set. <a href="goals.html">Set your goals!</a></p>';
    }

    // currently reading section
    const div = el('currentlyReading');
    if (!div) return;

    if (readingBooks.length === 0) {
        div.innerHTML = '<p>No books in progress. <a href="add-book.html">Add a book!</a></p>';
        return;
    }

    div.innerHTML = readingBooks.map(book => {
        const progress = book.totalPages > 0
            ? Math.round((book.currentPage / book.totalPages) * 100)
            : 0;

        return `
            <div class="book-card">
                <h4>${book.title}</h4>
                <p>by ${book.author}</p>
                <p>${book.currentPage} / ${book.totalPages} pages</p>
                <div class="progress-bar">
                    <div class="progress-fill" style="width:${progress}%"></div>
                </div>
                <p>${progress}% complete</p>
                <button class="btn btn-small btn-primary" onclick="logProgress(${book.id})">
                    Log Progress
                </button>
            </div>`;
    }).join('');
}


// ============================================================
// 4. ADD BOOK  (add-book.html)
// ============================================================

function addBook(e) {
    e.preventDefault();
    console.log('addBook() called');

    const title      = document.getElementById('title').value.trim();
    const author     = document.getElementById('author').value.trim();
    const totalPages = parseInt(document.getElementById('totalPages').value);
    const status     = document.getElementById('status').value;

    if (!title || !author || isNaN(totalPages) || totalPages <= 0) {
        alert('Please fill in all fields correctly!');
        return;
    }

    const today = new Date().toISOString().split('T')[0];

    const newBook = {
        id:          Date.now(),
        title:       title,
        author:      author,
        totalPages:  totalPages,
        currentPage: status === 'finished' ? totalPages : 0,
        status:      status,
        startDate:   today,
        finishDate:  status === 'finished' ? today : null,
        rating:      0,
        notes:       ''
    };

    const books = getBooks();
    if (status === 'finished') {
        const rating = promptForBookRating(title);
        if (rating === null) {
            return;
        }
        newBook.rating = rating;
    }
    books.push(newBook);
    saveBooks(books);

    if (status === 'finished') {
        const logs = getLogs();
        logs.push({
            id:        Date.now() + 1,
            bookId:    newBook.id,
            date:      today,
            pagesRead: totalPages
        });
        saveLogs(logs);
    }

    alert('Book added successfully!');
    window.location.href = 'books.html';
}


// ============================================================
// 5. BOOKS LIST  (books.html)
// ============================================================

let currentFilter = 'all';
let currentSort = 'default';

function displayBooks(filter) {
    filter = filter || currentFilter || 'all';
    currentFilter = filter;

    console.log('displayBooks() filter:', filter);

    const bookListDiv = document.getElementById('bookList');
    if (!bookListDiv) return;

    let books = getBooks();

    if (filter !== 'all') {
        books = books.filter(b => b.status === filter);
    }

    if (currentSort === 'rating-desc') {
        books.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
    } else if (currentSort === 'rating-asc') {
        books.sort((a, b) => (Number(a.rating) || 0) - (Number(b.rating) || 0));
    }

    if (books.length === 0) {
        bookListDiv.innerHTML = '<p>No books found. <a href="add-book.html">Add your first book!</a></p>';
        return;
    }

    const statusText = { want: 'Want to Read', reading: 'Reading', finished: 'Finished' };

    bookListDiv.innerHTML = books.map(book => {
        const displayPage = book.status === 'finished' ? book.totalPages : book.currentPage;
        const progress    = book.totalPages > 0
            ? Math.round((displayPage / book.totalPages) * 100)
            : 0;
        const safeTitle = escapeHtml(book.title);
        const safeNotes = escapeHtml(book.notes || '');
        const rating = Number(book.rating) || 0;
        const showReviewFields = book.status === 'finished';
        const stars = [1, 2, 3, 4, 5].map(value => `
            <button
                type="button"
                class="rating-star ${value <= rating ? 'is-active' : ''}"
                onclick="updateBookRating(${book.id}, ${value})"
                aria-label="Rate ${safeTitle} ${value} out of 5"
            >&#9733;</button>
        `).join('');

        return `
            <div class="book-item">
                <div class="book-info">
                    <h4>${book.title}</h4>
                    <p>by ${book.author}</p>
                    <p>${displayPage} / ${book.totalPages} pages (${progress}%)</p>
                    <span class="status-badge status-${book.status}">
                        ${statusText[book.status] || book.status}
                    </span>
                    ${showReviewFields ? `
                        <div class="book-meta">
                            <div class="rating-row">
                                <span class="meta-label">Rating</span>
                                <div class="rating-stars" role="group" aria-label="Rating for ${safeTitle}">
                                    ${stars}
                                </div>
                                <span class="rating-value">${rating ? `${rating}/5` : 'Not rated'}</span>
                            </div>
                            <label class="notes-field" for="notes-${book.id}">Notes</label>
                            <textarea id="notes-${book.id}" class="book-notes-input" placeholder="Add your thoughts, favorite quotes, or reminders...">${safeNotes}</textarea>
                        </div>
                    ` : ''}
                </div>
                <div class="book-actions">
                    ${book.status !== 'finished'
                        ? `<button class="btn btn-small btn-primary" onclick="logProgress(${book.id})">Log Progress</button>`
                        : ''}
                    ${showReviewFields
                        ? `<button class="btn btn-small btn-secondary" onclick="saveBookNotes(${book.id})">Save Notes</button>`
                        : ''}
                    <button class="btn btn-small btn-danger" onclick="deleteBook(${book.id})">Delete</button>
                </div>
            </div>`;
    }).join('');
}

function filterBooks(status, clickedBtn) {
    currentFilter = status;
    displayBooks(status);

    document.querySelectorAll('.filter-buttons .btn').forEach(btn => {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-secondary');
    });
    if (clickedBtn) {
        clickedBtn.classList.remove('btn-secondary');
        clickedBtn.classList.add('btn-primary');
    }
}

function setBookSort(sortValue) {
    currentSort = sortValue || 'default';
    displayBooks(currentFilter);
}


// ============================================================
// 6. LOG PROGRESS
// ============================================================

function logProgress(bookId) {
    const books     = getBooks();
    const bookIndex = books.findIndex(b => b.id === bookId);

    if (bookIndex === -1) { alert('Book not found!'); return; }

    const book  = books[bookIndex];
    const input = prompt(`How many pages did you read today for "${book.title}"?`);

    if (input === null || input === '') return;

    const pages = parseInt(input);
    if (isNaN(pages) || pages <= 0) {
        alert('Please enter a valid number of pages.');
        return;
    }

    books[bookIndex].currentPage = Math.min(
        books[bookIndex].currentPage + pages,
        books[bookIndex].totalPages
    );

    if (books[bookIndex].currentPage >= books[bookIndex].totalPages) {
        books[bookIndex].status     = 'finished';
        books[bookIndex].finishDate = new Date().toISOString().split('T')[0];
        const rating = promptForBookRating(book.title);
        if (rating !== null) {
            books[bookIndex].rating = rating;
        }
        alert('Congratulations! You finished the book!');
    } else {
        alert('Progress logged!');
    }

    saveBooks(books);

    const logs = getLogs();
    logs.push({
        id:        Date.now(),
        bookId:    bookId,
        date:      new Date().toISOString().split('T')[0],
        pagesRead: pages
    });
    saveLogs(logs);

    if (document.getElementById('currentlyReading')) displayDashboard();
    if (document.getElementById('bookList'))          displayBooks(currentFilter);
}

function updateBookRating(bookId, rating) {
    const books = getBooks();
    const bookIndex = books.findIndex(b => b.id === bookId);

    if (bookIndex === -1) {
        alert('Book not found!');
        return;
    }

    books[bookIndex].rating = rating;
    saveBooks(books);
    displayBooks(currentFilter);
}

function saveBookNotes(bookId) {
    const books = getBooks();
    const bookIndex = books.findIndex(b => b.id === bookId);
    const notesField = document.getElementById(`notes-${bookId}`);

    if (bookIndex === -1 || !notesField) {
        alert('Unable to save notes for this book.');
        return;
    }

    books[bookIndex].notes = notesField.value.trim();
    saveBooks(books);
    alert('Notes saved!');
}


// ============================================================
// 7. DELETE BOOK
// ============================================================

function deleteBook(bookId) {
    if (!confirm('Are you sure you want to delete this book?')) return;

    saveBooks(getBooks().filter(b => b.id !== bookId));
    saveLogs(getLogs().filter(l => l.bookId !== bookId));

    alert('Book deleted!');
    displayBooks(currentFilter);
}


// ============================================================
// 8. STATISTICS  (stats.html)
// ============================================================

function displayStats() {
    const books = getBooks();
    const logs  = getLogs();

    const now       = new Date();
    const thisMonth = now.getMonth();
    const thisYear  = now.getFullYear();

    const monthLogs = logs.filter(log => {
        const d = new Date(log.date);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    });

    const totalPagesThisMonth = monthLogs.reduce((sum, l) => sum + (l.pagesRead || 0), 0);

    const booksFinishedThisMonth = books.filter(b => {
        if (b.status !== 'finished' || !b.finishDate) return false;
        const d = new Date(b.finishDate);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).length;

    const readingNow     = books.filter(b => b.status === 'reading').length;
    const uniqueDays     = new Set(monthLogs.map(l => l.date)).size;
    const avgPagesPerDay = uniqueDays > 0 ? (totalPagesThisMonth / uniqueDays).toFixed(1) : 0;

    const totalBooks        = books.length;
    const totalFinished     = books.filter(b => b.status === 'finished').length;
    const totalPagesAllTime = logs.reduce((sum, l) => sum + (l.pagesRead || 0), 0);
    const totalSessions     = logs.length;

    const monthlyDiv = document.getElementById('monthlyStats');
    if (monthlyDiv) {
        monthlyDiv.innerHTML = `
            <div class="stat-card"><h3>${totalPagesThisMonth}</h3><p>Pages This Month</p></div>
            <div class="stat-card"><h3>${booksFinishedThisMonth}</h3><p>Books Finished</p></div>
            <div class="stat-card"><h3>${readingNow}</h3><p>Currently Reading</p></div>
            <div class="stat-card"><h3>${avgPagesPerDay}</h3><p>Avg Pages / Day</p></div>`;
    }

    const alltimeDiv = document.getElementById('alltimeStats');
    if (alltimeDiv) {
        alltimeDiv.innerHTML = `
            <div class="stat-card"><h3>${totalBooks}</h3><p>Total Books</p></div>
            <div class="stat-card"><h3>${totalFinished}</h3><p>Books Finished</p></div>
            <div class="stat-card"><h3>${totalPagesAllTime}</h3><p>Total Pages Read</p></div>
            <div class="stat-card"><h3>${totalSessions}</h3><p>Reading Sessions</p></div>`;
    }
}


// ============================================================
// 9. READING GOALS (goals.html)
// ============================================================

function displayGoals() {
    const goals = getGoals();
    
    const monthlyInput = document.getElementById('monthlyGoal');
    const yearlyInput  = document.getElementById('yearlyGoal');
    
    if (monthlyInput) monthlyInput.value = goals.monthly || '';
    if (yearlyInput)  yearlyInput.value  = goals.yearly || '';
}

function saveGoalsFromForm(e) {
    e.preventDefault();
    
    const monthly = parseInt(document.getElementById('monthlyGoal').value) || 0;
    const yearly  = parseInt(document.getElementById('yearlyGoal').value) || 0;
    
    if (monthly < 0 || yearly < 0) {
        alert('Goals must be positive numbers!');
        return;
    }
    
    saveGoals({ monthly, yearly });
    alert('Book goals saved!');
    window.location.href = 'index.html';
}


// ============================================================
// 10. AUTO-INIT
// ============================================================

document.addEventListener('DOMContentLoaded', function () {
    const page = window.location.pathname.split('/').pop();
    console.log('Page:', page);

    fixFinishedBooks();

    if (page === 'index.html' || page === '' || page === '/') {
        displayDashboard();
    }
    if (page === 'books.html') {
        displayBooks('all');
    }
    if (page === 'add-book.html') {
        const form = document.getElementById('addBookForm');
        if (form) form.addEventListener('submit', addBook);
    }
    if (page === 'stats.html') {
        displayStats();
    }
    if (page === 'goals.html') {
        displayGoals();
        const form = document.getElementById('goalsForm');
        if (form) form.addEventListener('submit', saveGoalsFromForm);
    }
});
