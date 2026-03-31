// ============================================================
//  BOOK TRACKER - app.js
//  Works for: index.html, books.html, add-book.html, stats.html
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


// ============================================================
// 2. FIX OLD FINISHED BOOKS
//    Runs on every page load to patch any broken finished books
// ============================================================

function fixFinishedBooks() {
    const books = getBooks();
    const logs  = getLogs();
    const today = new Date().toISOString().split('T')[0];
    let changed = false;

    books.forEach(book => {
        if (book.status === 'finished') {

            // fix currentPage = 0 for finished books
            if (!book.currentPage || book.currentPage < book.totalPages) {
                book.currentPage = book.totalPages;
                changed = true;
            }

            // fix missing finishDate
            if (!book.finishDate) {
                book.finishDate = today;
                changed = true;
            }

            // create missing reading log so pages count in stats
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
        finishDate:  status === 'finished' ? today : null
    };

    const books = getBooks();
    books.push(newBook);
    saveBooks(books);

    // create a reading log for finished books so pages count in stats
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

    if (books.length === 0) {
        bookListDiv.innerHTML = '<p>No books found. <a href="add-book.html">Add your first book!</a></p>';
        return;
    }

    const statusText = { want: 'Want to Read', reading: 'Reading', finished: 'Finished' };

    bookListDiv.innerHTML = books.map(book => {
        // always show full pages for finished books
        const displayPage = book.status === 'finished' ? book.totalPages : book.currentPage;
        const progress    = book.totalPages > 0
            ? Math.round((displayPage / book.totalPages) * 100)
            : 0;

        return `
            <div class="book-item">
                <div class="book-info">
                    <h4>${book.title}</h4>
                    <p>by ${book.author}</p>
                    <p>${displayPage} / ${book.totalPages} pages (${progress}%)</p>
                    <span class="status-badge status-${book.status}">
                        ${statusText[book.status] || book.status}
                    </span>
                </div>
                <div class="book-actions">
                    ${book.status !== 'finished'
                        ? `<button class="btn btn-small btn-primary" onclick="logProgress(${book.id})">Log Progress</button>`
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
// 9. AUTO-INIT
// ============================================================

document.addEventListener('DOMContentLoaded', function () {
    const page = window.location.pathname.split('/').pop();
    console.log('Page:', page);

    // fix any broken finished books first, every time
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
});