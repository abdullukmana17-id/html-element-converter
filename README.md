# HTMLElementConverter

Kelas untuk mengonversi elemen HTML berdasarkan aturan (`selector` atau `tag`) yang Anda definisikan. Setiap aturan memiliki fungsi `render` yang dapat mengakses atribut, elemen anak, dan elemen terkait, lalu mengganti, menghapus, atau mengubahnya.

Hasil konversi **dikembalikan sebagai string HTML**. DOM asli tidak berubah kecuali Anda menerapkannya (lihat [Menerapkan hasil ke halaman](#menerapkan-hasil-ke-halaman)).

---

## Daftar isi

1. [Mulai cepat](#mulai-cepat)
2. [Konfigurasi](#konfigurasi)
3. [Fungsi `render`](#fungsi-render)
4. [Nilai `return`](#nilai-return)
5. [Objek `ctx`](#objek-ctx)
6. [Contoh penggunaan](#contoh-penggunaan)
7. [Menerapkan hasil ke halaman](#menerapkan-hasil-ke-halaman)
8. [Cara kerja dan aturan penting](#cara-kerja-dan-aturan-penting)
9. [Pemecahan masalah](#pemecahan-masalah)
10. [Keamanan](#keamanan)

---

## Mulai cepat

HTML input:

```html
<div id="root">
    <p data-align="center" title="Info">
        Halo <a href="https://example.com">dunia</a>
    </p>
</div>
```

Konfigurasi dan pemakaian:

```javascript
const CONVERTER = {
    root: "#root",
    elements: [
        {
            tag: "p",
            render: (html, element, ctx) => {
                const p = document.createElement("p");
                p.className = "mb-0";

                const align = ctx.getAttr("data-align");
                if (align) p.classList.add(`text-${align}`);

                p.innerHTML = html;
                return p;
            }
        }
    ]
};

const converter = new HTMLElementConverter(CONVERTER);
const html = converter.convert();

console.log(html);
```

Hasil:

```html
<p class="mb-0 text-center">
    Halo <a href="https://example.com">dunia</a>
</p>
```

---

## Konfigurasi

```javascript
new HTMLElementConverter({
    root: "#root",
    elements: [ /* daftar aturan */ ]
});
```

| Properti   | Tipe     | Default  | Keterangan                                     |
| ---------- | -------- | -------- | ---------------------------------------------- |
| `root`     | `string` | `"body"` | CSS selector elemen yang akan dikonversi.      |
| `elements` | `Array`  | `[]`     | Daftar aturan konversi.                        |

### Aturan (`elements`)

| Properti   | Tipe       | Wajib | Keterangan                                                       |
| ---------- | ---------- | ----- | ---------------------------------------------------------------- |
| `selector` | `string`   | salah satu | CSS selector penuh, mis. `a[href^="http"]`, `div.gallery`.  |
| `tag`      | `string`   | salah satu | Nama tag, mis. `"p"`. Dipakai jika `selector` tidak ada.    |
| `render`   | `function` | ya    | Fungsi yang menentukan hasil konversi.                           |

Aturan tanpa `selector`/`tag` atau tanpa fungsi `render` akan dilewati.

---

## Fungsi `render`

```javascript
render: (html, element, ctx) => { /* ... */ }
```

| Argumen   | Keterangan                                                     |
| --------- | -------------------------------------------------------------- |
| `html`    | `innerHTML` elemen (anak yang bersarang sudah terkonversi).    |
| `element` | Elemen asli (pada salinan DOM).                                |
| `ctx`     | Objek helper untuk atribut, elemen terkait, dan modifikasi.    |

Fungsi lama berbentuk `(text) => ...` tetap berjalan karena dua argumen pertama tidak berubah.

---

## Nilai `return`

| Return                          | Efek                                                         |
| ------------------------------- | ------------------------------------------------------------ |
| `Node`                          | Elemen diganti dengan node tersebut.                         |
| `string`                        | Diparse sebagai HTML, lalu menggantikan elemen.              |
| `[node, "<b>x</b>", ...]`       | Elemen diganti beberapa node sekaligus.                      |
| `false` atau `""`               | Elemen dihapus.                                              |
| `null` / `undefined`            | Elemen dibiarkan. Perubahan lewat `ctx` tetap berlaku.       |

---

## Objek `ctx`

### Informasi elemen

| Properti       | Keterangan                                      |
| -------------- | ----------------------------------------------- |
| `ctx.element`  | Elemen asli.                                    |
| `ctx.tag`      | Nama tag huruf kecil.                           |
| `ctx.html`     | `innerHTML`.                                    |
| `ctx.text`     | `textContent` (teks tanpa tag).                 |
| `ctx.attrs`    | Semua atribut sebagai object biasa.             |
| `ctx.dataset`  | Atribut `data-*` sebagai object biasa.          |
| `ctx.children` | Elemen anak langsung (tanpa text node).         |

### Elemen terkait

| Properti / method     | Keterangan                          |
| --------------------- | ----------------------------------- |
| `ctx.parent`          | Elemen induk.                       |
| `ctx.next`            | Saudara berikutnya.                 |
| `ctx.prev`            | Saudara sebelumnya.                 |
| `ctx.closest(sel)`    | Leluhur terdekat yang cocok.        |
| `ctx.query(sel)`      | Elemen pertama di dalam yang cocok. |
| `ctx.queryAll(sel)`   | Semua elemen di dalam yang cocok (array). |

### Atribut

| Method                     | Keterangan                                       |
| -------------------------- | ------------------------------------------------ |
| `ctx.getAttr(name, fallback)` | Ambil nilai atribut, `fallback` (default `null`) jika tidak ada. |
| `ctx.hasAttr(name)`        | Cek atribut ada atau tidak.                      |
| `ctx.setAttr(name, value)` | Ubah atribut elemen ini.                         |
| `ctx.removeAttr(name)`     | Hapus atribut elemen ini.                        |

### Memodifikasi elemen terkait

| Method                      | Keterangan                                          |
| --------------------------- | --------------------------------------------------- |
| `ctx.replace(target, konten)` | Ganti `target` (diri sendiri, anak, induk, saudara). |
| `ctx.remove(target)`        | Hapus `target`.                                     |
| `ctx.unwrap(target)`        | Buang pembungkus, sisakan isinya.                   |
| `ctx.before(target, konten)` | Sisipkan konten sebelum `target`.                  |
| `ctx.after(target, konten)` | Sisipkan konten sesudah `target`.                   |

`konten` dapat berupa `Node`, string HTML, array, atau `null`/`false` (hapus).

---

## Contoh penggunaan

### 1. Menghapus elemen

Letakkan aturan penghapusan **paling atas** agar menang atas aturan lain.

```javascript
{
    selector: "script, .hidden",
    render: () => false
}
```

### 2. Mengakses atribut

```javascript
{
    selector: "img",
    render: (html, element, ctx) => {
        const img = document.createElement("img");
        img.src = ctx.getAttr("src", "");
        img.alt = ctx.getAttr("alt", "");
        img.loading = "lazy";
        return img;
    }
}
```

### 3. Mempertahankan semua atribut lama

```javascript
{
    tag: "p",
    render: (html, element, ctx) => {
        const p = document.createElement("p");

        for (const [name, value] of Object.entries(ctx.attrs)) {
            p.setAttribute(name, value);
        }

        p.classList.add("mb-0");
        p.innerHTML = html;
        return p;
    }
}
```

### 4. Mengubah link eksternal

```javascript
{
    selector: "a[href]",
    render: (html, element, ctx) => {
        const href = ctx.getAttr("href", "").trim();

        // Bukan link eksternal: biarkan apa adanya
        if (!/^(https?:)?\/\//i.test(href)) return null;

        const link = document.createElement("a");
        link.href = href;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.innerHTML = html;
        return link;
    }
}
```

### 5. Mengganti elemen anak

```javascript
{
    selector: "div.gallery",
    render: (html, element, ctx) => {
        ctx.queryAll("img").forEach((img) => {
            const figure = document.createElement("figure");
            figure.appendChild(img.cloneNode(true));
            ctx.replace(img, figure);
        });
        return null; // div.gallery tetap
    }
}
```

### 6. Mengganti elemen induk

```javascript
{
    selector: "span.note",
    render: (html, element, ctx) => {
        const parent = ctx.parent;

        if (parent && parent.tagName === "P") {
            const aside = document.createElement("aside");
            aside.className = "note";
            aside.innerHTML = html;
            ctx.replace(parent, aside);
        }
        // Induk sudah diganti, elemen ini otomatis dilewati.
    }
}
```

### 7. Mengganti dengan beberapa node

```javascript
{
    selector: "hr",
    render: () => [
        document.createElement("br"),
        "<span class='divider'></span>"
    ]
}
```

### 8. Membuka pembungkus

```javascript
{
    selector: "div.wrapper",
    render: (html, element, ctx) => {
        ctx.queryAll("font").forEach((font) => ctx.unwrap(font));
        return null;
    }
}
```

---

## Menerapkan hasil ke halaman

`convert()` hanya mengembalikan string. Terapkan sendiri:

```javascript
const converter = new HTMLElementConverter(CONVERTER);
const html = converter.convert();

document.querySelector("#root").innerHTML = html;
```

Atau tambahkan method berikut ke dalam class:

```javascript
/** Terapkan hasil konversi ke elemen root di halaman. */
apply() {
    const root = this.getRoot();

    if (!root) {
        return null;
    }

    root.innerHTML = this.convertAll(root);
    return root;
}
```

```javascript
new HTMLElementConverter(CONVERTER).apply();
```

Mengatur `innerHTML` membuang event listener yang menempel pada elemen lama. Pasang ulang listener setelah `apply()` bila diperlukan.

---

## Cara kerja dan aturan penting

1. **Bekerja pada salinan.** Root disalin dengan `cloneNode(true)`, sehingga DOM asli tidak berubah.
2. **Elemen terdalam diproses lebih dulu.** Saat `render` elemen luar berjalan, `html` miliknya sudah berisi hasil konversi anak-anaknya.
3. **Aturan pertama yang cocok yang dipakai.** Jika sebuah elemen cocok dengan beberapa aturan, hanya aturan paling atas yang berjalan. Urutan `elements` menentukan prioritas.
4. **Hasil `render` tidak diproses ulang.** Node baru tidak dikonversi lagi, sehingga tidak terjadi loop tak terbatas. Jalankan konversi dua kali jika memang diperlukan.
5. **Elemen yang terlepas dilewati.** Jika induk atau elemen lain diganti di dalam `render`, elemen yang sudah tidak ada di container otomatis dilewati.
6. **Elemen baru dibuat dari nol.** Atribut asli (`id`, `class`, `style`, dan sebagainya) tidak terbawa kecuali Anda menyalinnya lewat `ctx.attrs`.

---

## Pemecahan masalah

| Gejala                                   | Kemungkinan penyebab dan solusi                                                                                          |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `convert()` mengembalikan string kosong  | `root` tidak ditemukan. Cek `console.log(converter.getRoot())`.                                                          |
| Halaman tidak berubah                    | Hasil hanya dikembalikan sebagai string. Gunakan `apply()` atau atur `innerHTML` sendiri.                                |
| Aturan tidak berjalan                    | Selector tidak cocok, atau elemen sudah cocok dengan aturan lain yang lebih atas. Periksa urutan dan selector.           |
| `<p class="hidden">` tidak terhapus      | Aturan `p` berada di atas aturan `.hidden`. Pindahkan aturan hapus ke paling atas.                                       |
| `TypeError: Konten harus berupa Node...` | `render` mengembalikan tipe yang tidak didukung (mis. object biasa). Kembalikan `Node`, string, array, `false`, atau `null`. |
| Atribut hilang pada hasil                | Elemen baru dibuat dari nol. Salin atribut lewat `ctx.attrs`.                                                            |

Untuk memeriksa aturan mana yang berjalan, tambahkan log sementara:

```javascript
render: (html, element, ctx) => {
    console.log("diproses:", ctx.tag, ctx.attrs);
    // ...
}
```

---

## Keamanan

String yang dikembalikan `render` diparse sebagai HTML. Jangan memasukkan data dari pengguna ke dalam template string tanpa disanitasi, karena dapat menyebabkan injeksi HTML (XSS).

Lebih aman:

- Membuat elemen dengan `document.createElement`, lalu mengisi nilainya lewat `textContent` atau properti (`img.alt = ...`).
- Menyalin elemen dengan `cloneNode(true)` alih-alih merakit string HTML.
- Menggunakan pustaka sanitasi seperti DOMPurify jika HTML berasal dari sumber yang tidak tepercaya.
