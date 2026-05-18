export const localeCookieName = 'evermedia_locale'
export const defaultLocale = 'en'
export const locales = ['en', 'id'] as const

export type Locale = (typeof locales)[number]

export function isLocale(value: unknown): value is Locale {
  return value === 'en' || value === 'id'
}

export function normalizeLocale(value: unknown): Locale {
  return isLocale(value) ? value : defaultLocale
}

export function getLocaleToggleLabel(locale: Locale) {
  return locale.toUpperCase()
}

export const dictionaries = {
  en: {
    auth: {
      backToSignIn: 'Back to sign in',
      configureSupabase:
        'Configure SUPABASE_URL and SUPABASE_ANON_KEY before using authentication.',
      confirmPassword: 'Confirm password',
      confirmPasswordPlaceholder: 'Confirm your new password',
      createNewPassword: 'Create a new password',
      email: 'Email',
      forgotPassword: 'Forgot password?',
      messages: {
        accountDisabled:
          'Your account is disabled. Contact a super admin to restore access.',
        accountNotProvisioned:
          'Your account is not provisioned for this studio yet. Contact a super admin.',
        invalidCredentials:
          'Email or password is incorrect. Try again or reset your password.',
        missingAccountEmail:
          'Enter the email address for your account and try again.',
        missingCredentials: 'Enter both your email and password and try again.',
        passwordUpdated: 'Password updated. Sign in with your new password.',
        recoveryExpired:
          'Your password reset link is invalid or expired. Request a new reset email.',
        resetSent: (email: string) =>
          `If an account exists for ${email || 'that email'}, a password reset email has been sent.`,
      },
      newPassword: 'New password',
      newPasswordPlaceholder: 'Create a new password',
      password: 'Password',
      passwordPlaceholder: 'Enter your password',
      passwordRecovery: 'Password Recovery',
      resetCopy:
        'Request a password reset email for your Supabase account. You can return to sign in any time.',
      resetInfo:
        "If an account exists for the email you enter, we'll send a reset link with instructions to create a new password.",
      resetPassword: 'Reset your password',
      secureAccess: 'Secure Access',
      sendResetEmail: 'Send Reset Email',
      signIn: 'Sign In',
      signInTitle: 'Sign in to your studio',
      updatePassword: 'Update Password',
      updatePasswordBusy: 'Updating Password...',
      updatePasswordErrorEmpty: 'Enter and confirm your new password.',
      updatePasswordErrorMismatch: 'Passwords do not match.',
      updatePasswordIntro: (email: string | null | undefined) =>
        `Set a new password for ${email ?? 'your account'} before returning to the studio.`,
    },
    dashboard: {
      experienceTabs: {
        guided: 'Guided',
        ideation: 'Ideation',
        manual: 'Manual',
      },
      workspaceTabs: {
        image: 'Image',
        video: 'Video',
      },
    },
    ideation: {
      outputLanguageInstruction:
        'Write every human-readable JSON value in English.',
      outputToolLanguageInstruction:
        'Write every human-readable tool input value in English.',
    },
    library: {
      title: 'Library',
    },
    notFound: {
      body:
        'Return to the studio workspace and continue configuring your generation flow.',
      cta: 'Back to Workspace',
      eyebrow: 'Not Found',
      title: 'This page does not exist',
    },
    shared: {
      language: {
        label: 'Language',
        english: 'English',
        indonesian: 'Bahasa Indonesia',
      },
      nav: {
        accounts: 'Accounts',
        library: 'Library',
        signOut: 'Sign out',
        signedIn: 'Signed in',
        studio: 'Studio',
      },
    },
  },
  id: {
    auth: {
      backToSignIn: 'Kembali ke halaman masuk',
      configureSupabase:
        'Konfigurasikan SUPABASE_URL dan SUPABASE_ANON_KEY sebelum menggunakan autentikasi.',
      confirmPassword: 'Konfirmasi kata sandi',
      confirmPasswordPlaceholder: 'Konfirmasi kata sandi baru',
      createNewPassword: 'Buat kata sandi baru',
      email: 'Email',
      forgotPassword: 'Lupa kata sandi?',
      messages: {
        accountDisabled:
          'Akun Anda dinonaktifkan. Hubungi super admin untuk memulihkan akses.',
        accountNotProvisioned:
          'Akun Anda belum diprovisikan untuk studio ini. Hubungi super admin.',
        invalidCredentials:
          'Email atau kata sandi salah. Coba lagi atau reset kata sandi Anda.',
        missingAccountEmail:
          'Masukkan alamat email akun Anda, lalu coba lagi.',
        missingCredentials: 'Masukkan email dan kata sandi, lalu coba lagi.',
        passwordUpdated:
          'Kata sandi diperbarui. Masuk dengan kata sandi baru Anda.',
        recoveryExpired:
          'Tautan reset kata sandi tidak valid atau sudah kedaluwarsa. Minta email reset baru.',
        resetSent: (email: string) =>
          `Jika akun untuk ${email || 'email tersebut'} ada, email reset kata sandi telah dikirim.`,
      },
      newPassword: 'Kata sandi baru',
      newPasswordPlaceholder: 'Buat kata sandi baru',
      password: 'Kata sandi',
      passwordPlaceholder: 'Masukkan kata sandi',
      passwordRecovery: 'Pemulihan Kata Sandi',
      resetCopy:
        'Minta email reset kata sandi untuk akun Supabase Anda. Anda bisa kembali masuk kapan saja.',
      resetInfo:
        'Jika akun untuk email yang Anda masukkan ada, kami akan mengirim tautan reset berisi instruksi untuk membuat kata sandi baru.',
      resetPassword: 'Reset kata sandi Anda',
      secureAccess: 'Akses Aman',
      sendResetEmail: 'Kirim Email Reset',
      signIn: 'Masuk',
      signInTitle: 'Masuk ke studio',
      updatePassword: 'Perbarui Kata Sandi',
      updatePasswordBusy: 'Memperbarui Kata Sandi...',
      updatePasswordErrorEmpty: 'Masukkan dan konfirmasi kata sandi baru Anda.',
      updatePasswordErrorMismatch: 'Kata sandi tidak cocok.',
      updatePasswordIntro: (email: string | null | undefined) =>
        `Atur kata sandi baru untuk ${email ?? 'akun Anda'} sebelum kembali ke studio.`,
    },
    dashboard: {
      experienceTabs: {
        guided: 'Terpandu',
        ideation: 'Ideasi',
        manual: 'Manual',
      },
      workspaceTabs: {
        image: 'Gambar',
        video: 'Video',
      },
    },
    ideation: {
      outputLanguageInstruction:
        'Write every human-readable JSON value in Bahasa Indonesia.',
      outputToolLanguageInstruction:
        'Write every human-readable tool input value in Bahasa Indonesia.',
    },
    library: {
      title: 'Library',
    },
    notFound: {
      body:
        'Kembali ke workspace studio dan lanjutkan pengaturan alur generasi Anda.',
      cta: 'Kembali ke Studio',
      eyebrow: 'Tidak Ditemukan',
      title: 'Halaman ini tidak ada',
    },
    shared: {
      language: {
        label: 'Bahasa',
        english: 'English',
        indonesian: 'Bahasa Indonesia',
      },
      nav: {
        accounts: 'Accounts',
        library: 'Library',
        signOut: 'Keluar',
        signedIn: 'Sudah masuk',
        studio: 'Studio',
      },
    },
  },
} as const

export type Dictionary = (typeof dictionaries)[Locale]

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale]
}

export const uiTranslations: Record<string, string> = {
  '4K Seedance 1.5 Pro output is not supported.':
    'Output 4K Seedance 1.5 Pro tidak didukung.',
  '4K Veo upgrades are deferred until a later phase.':
    'Peningkatan 4K Veo ditunda hingga fase berikutnya.',
  'A hero product image is required.': 'Tambahkan dulu gambar produk utama.',
  'A hero image is required before guided analysis can begin.':
    'Tambahkan dulu gambar utama sebelum analisis terpandu dimulai.',
  'Add a hero product image or a product URL first.':
    'Tambahkan dulu gambar produk utama atau URL produk.',
  'Add a hero product image or a product URL.':
    'Tambahkan gambar produk utama atau URL produk.',
  'Add a reference image or describe the image prompt first.':
    'Tambahkan gambar referensi atau jelaskan prompt gambar terlebih dahulu.',
  'Add a start-frame reference or describe the motion prompt first.':
    'Tambahkan referensi frame awal atau jelaskan prompt gerakan terlebih dahulu.',
  'Add at least one source input, run analysis, and the saved three-card brief will appear here.':
    'Tambahkan minimal satu sumber materi, jalankan analisis, lalu brief tiga kartu yang tersimpan akan muncul di sini.',
  'Add at least one source input. Ideation can run from a hero image, a product URL, or both together.':
    'Tambahkan minimal satu sumber materi. Ideasi bisa berjalan dari gambar utama, URL produk, atau keduanya.',
  'Additional Instructions': 'Instruksi tambahan',
  'Add any extra creative direction, for example: dramatic backlight, golden hour, neon rim light…':
    'Tambahkan arahan kreatif tambahan, misalnya: backlight dramatis, golden hour, rim light neon…',
  'Affiliate': 'Afiliasi',
  'Analyze': 'Analisis',
  'Analyze Content Ideation': 'Analisis Ideasi Konten',
  'Analyze input': 'Analisis input',
  'Analyze the hero product first to unlock prompt editing and rendering.':
    'Analisis produk hero terlebih dahulu untuk membuka pengeditan prompt dan rendering.',
  'Analyze the product first to create the shot plan.':
    'Analisis produk terlebih dahulu untuk membuat rencana shot.',
  'Analyze the product, edit the prompt set, then render the guided batch to populate this grid.':
    'Analisis produknya, rapikan prompt-nya, lalu render batch terpandu untuk mengisi grid ini.',
  'Analyzing': 'Menganalisis',
  'Analyzing Ideation Brief...': 'Menganalisis Brief Ideasi...',
  'Analyzing the hero image and rebuilding the guided shot list...':
    'Menganalisis gambar hero dan menyusun ulang daftar shot terpandu...',
  'Any': 'Apa saja',
  'Any Cast': 'Talent bebas',
  'Pick the strategic bias before ideation runs.':
    'Pilih bias strategis sebelum ideasi dijalankan.',
  'Campaign goal:': 'Tujuan kampanye:',
  'Campaign context for the generated prompt.':
    'Konteks kampanye untuk prompt yang dihasilkan.',
  'Archive': 'Arsip',
  'Archive size': 'Ukuran arsip',
  'Adult': 'Dewasa',
  'Audience:': 'Audiens:',
  'Build the input set': 'Siapkan materi input',
  'Back to Workspace': 'Kembali ke Workspace',
  'Batch size': 'Ukuran batch',
  'Brief': 'Brief',
  'Briefs': 'Brief',
  'Build the reference board first, or use the written brief if you need a prompt-only run.':
    'Siapkan papan referensi terlebih dahulu, atau gunakan brief tertulis jika Anda hanya ingin generate dari prompt.',
  'Building a new ideation brief': 'Membangun brief ideasi baru',
  'Build the generation preset': 'Susun preset generasi',
  'Camera': 'Kamera',
  'Camera Movement': 'Pergerakan kamera',
  'Camera movement is treated as a structured prompt modifier.':
    'Pergerakan kamera diperlakukan sebagai pengubah prompt terstruktur.',
  'Cancel': 'Batal',
  'Cancel Run': 'Batalkan Run',
  'Cancel Guided Run': 'Batalkan Run Terpandu',
  'Casting': 'Casting',
  'Character Demographics (Auto-Prompt)': 'Demografi karakter (Auto-Prompt)',
  'Choose the figure styling direction.': 'Pilih arah styling figur.',
  'Choose the subject setup for this preset.':
    'Pilih pengaturan subjek untuk preset ini.',
  'Clothing & Fashion': 'Pakaian & Fashion',
  'Clip length': 'Durasi klip',
  'Clear': 'Hapus',
  'Close': 'Tutup',
  'Concept': 'Konsep',
  'Confirm': 'Konfirmasi',
  'Confirm the setup, choose model/batch settings, then run generation.':
    'Periksa pengaturannya, pilih model dan batch, lalu mulai generate.',
  'Content Concept': 'Konsep Konten',
  'Cosmetics & Beauty': 'Kosmetik & Kecantikan',
  'Cost-aware LLM selection for the ideation step.':
    'Pemilihan LLM yang mempertimbangkan biaya untuk tahap ideasi.',
  'Cost-aware LLM selection for guided analysis.':
    'Pemilihan LLM yang mempertimbangkan biaya untuk analisis terpandu.',
  'Cost-aware LLM selection for the planning step.':
    'Pilih model analisis yang paling pas untuk tahap perencanaan.',
  'Copy': 'Salin',
  'Copy card': 'Salin kartu',
  'Copy full brief': 'Salin brief lengkap',
  'Copy full ideation': 'Salin ideasi lengkap',
  'Copied': 'Tersalin',
  'CTA:': 'CTA:',
  'Delete': 'Hapus',
  'Delete output?': 'Hapus output?',
  'Delete media?': 'Hapus media?',
  'Delete session?': 'Hapus sesi?',
  'Delete media set?': 'Hapus set media?',
  'Default': 'Default',
  'Default style bias:': 'Bias gaya default:',
  'Download': 'Unduh',
  'Drone': 'Drone',
  'Driven Ads': 'Iklan Performa',
  'Error': 'Error',
  'Edit the shot plan': 'Edit rencana shot',
  'Email or password is incorrect. Try again or reset your password.':
    'Email atau kata sandi salah. Coba lagi atau reset kata sandi Anda.',
  'End frame reference': 'Referensi frame akhir',
  'Forward to Video': 'Teruskan ke Video',
  'Forwarding...': 'Meneruskan...',
  'Editorial direction when a person is present.':
    'Arah editorial saat ada orang di dalam adegan.',
  'Electronics & Tech': 'Elektronik & Teknologi',
  'Environment': 'Lingkungan',
  'Estimated cost': 'Estimasi biaya',
  'Exterior location with natural environmental context.':
    'Lokasi luar ruang dengan konteks lingkungan alami.',
  'Female': 'Perempuan',
  'Figure Art Direction': 'Arah Seni Figur',
  'Figure art direction is available only for lifestyle presets.':
    'Arah seni figur hanya tersedia untuk preset lifestyle.',
  'Food & Drink': 'Makanan & Minuman',
  'Full figure, dramatic curves, fashion-forward.':
    'Figur penuh, lekuk dramatis, bergaya fashion-forward.',
  'Generate exactly this many prompts and result tiles.':
    'Buat prompt dan tile hasil sesuai jumlah ini.',
  'Generate Guided Batch': 'Buat Batch Terpandu',
  'Generate the guided batch': 'Buat batch terpandu',
  'Generate the ideation brief': 'Buat brief ideasi',
  'Generated results': 'Hasil generasi',
  'Generating Guided Batch...': 'Membuat Batch Terpandu...',
  'Guided runs populate one result tile per planned shot as each task completes.':
    'Run terpandu mengisi satu tile hasil untuk setiap shot terencana saat tiap tugas selesai.',
  'Guided runs render one tile per planned shot and keep the prompts attached to each result.':
    'Run terpandu merender satu tile per shot terencana dan menjaga prompt tetap terlampir pada setiap hasil.',
  'Guided': 'Terpandu',
  'Gender': 'Gender',
  'Generation stopped before completion': 'Generasi berhenti sebelum selesai',
  'Google image generation with direct reference input':
    'Generasi gambar Google dengan input referensi langsung',
  'Hero Product': 'Produk Hero',
  'Hero image ready. Analyze to generate the guided shot list.':
    'Gambar utama siap. Jalankan analisis untuk membuat daftar shot terpandu.',
  'Hero image ready. Re-analyze when you want to replace the current prompt set.':
    'Gambar utama siap. Jalankan analisis ulang jika Anda ingin mengganti set prompt saat ini.',
  'Upload or forward a start frame':
    'Unggah atau teruskan start frame',
  'You can replace the start frame before re-analyzing or rendering again.':
    'Anda dapat mengganti start frame sebelum menjalankan analisis ulang atau render lagi.',
  'A start frame is required before guided video analysis can begin.':
    'Start frame diperlukan sebelum analisis video terpandu dapat dimulai.',
  'A start frame is still required before you can generate the guided video batch.':
    'Start frame tetap diperlukan sebelum Anda dapat membuat batch video terpandu.',
  'Analyze the start frame first to unlock guided video prompt editing and rendering.':
    'Analisis start frame terlebih dahulu untuk membuka pengeditan prompt dan rendering video terpandu.',
  'Upload or forward the start frame, add any page context, then generate the initial video shot list before editing the prompts.':
    'Unggah atau teruskan start frame, tambahkan konteks halaman bila perlu, lalu buat daftar shot video awal sebelum mengedit prompt.',
  'Upload or forward a start frame to unlock guided video analysis.':
    'Unggah atau teruskan start frame untuk membuka analisis video terpandu.',
  'Start frame ready. Re-analyze when you want to rebuild the guided video prompt set.':
    'Start frame siap. Jalankan analisis ulang jika Anda ingin membangun ulang set prompt video terpandu.',
  'Start frame ready. Analyze to generate the guided video shot list.':
    'Start frame siap. Jalankan analisis untuk membuat daftar shot video terpandu.',
  'Hook:': 'Hook:',
  'Ideation': 'Ideasi',
  'Ideation analysis needs another pass': 'Analisis ideasi perlu dijalankan lagi',
  'Ideation brief': 'Brief ideasi',
  'Ideation brief is ready': 'Brief ideasi siap',
  'Image': 'Gambar',
  'Image batches render 2x2 grids, then split each grid into four outputs.':
    'Batch gambar dirender sebagai grid 2x2, lalu tiap grid dipecah menjadi empat output.',
  'Image model': 'Model gambar',
  'Image resolution': 'Resolusi gambar',
  'Image session': 'Sesi gambar',
  'Image media set': 'Set media gambar',
  'Image workspace': 'Workspace gambar',
  'Guided mode uses one product image as the visual anchor for shot planning and final rendering.':
    'Mode terpandu memakai satu gambar produk sebagai acuan utama untuk menyusun shot dan render akhir.',
  'Guided video mode uses one staged image as the start-frame anchor for analysis and final rendering.':
    'Mode video terpandu memakai satu gambar yang sudah disiapkan sebagai acuan start frame untuk analisis dan render akhir.',
  'Indoor': 'Indoor',
  'indoor': 'indoor',
  'Indoor or outdoor context.': 'Konteks indoor atau outdoor.',
  'Inputs are ready': 'Input siap',
  'Jewelry': 'Perhiasan',
  'Lifestyle presets can bias cast attributes without changing the reference board.':
    'Preset lifestyle dapat mengarahkan atribut talent tanpa mengubah papan referensi.',
  'Lifestyle': 'Lifestyle',
  'Lifestyle image with a person naturally interacting with the product.':
    'Visual lifestyle dengan seseorang yang berinteraksi alami dengan produk.',
  'lifestyle': 'lifestyle',
  'Key message:': 'Pesan utama:',
  'Keep Current Plan': 'Pertahankan Rencana Saat Ini',
  'Keep the render settings and batch status visible while you refine the prompts.':
    'Biarkan pengaturan render dan status batch tetap terlihat saat Anda menyempurnakan prompt.',
  'KIE Analysis Model': 'Model Analisis KIE',
  'KIE Credits': 'Kredit KIE',
  'Latest save': 'Simpanan terbaru',
  'Library': 'Library',
  'Manual': 'Manual',
  'Male': 'Laki-laki',
  'Market-model text or image video': 'Video teks atau gambar model pasar',
  'Middle Aged': 'Paruh baya',
  'Miscellaneous': 'Lain-lain',
  'Model': 'Model',
  'Motion': 'Gerakan',
  'Motion controls': 'Kontrol gerakan',
  'Motion language used during analysis and rendering.':
    'Arah gerakan yang dipakai saat analisis dan rendering.',
  'Movement language': 'Bahasa pergerakan',
  'Needs Attention': 'Perlu Perhatian',
  'No media references loaded yet': 'Belum ada referensi media yang dimuat',
  'None': 'Tidak ada',
  'None Selected': 'Belum dipilih',
  'Non-Binary': 'Non-biner',
  'No guided prompt set yet': 'Belum ada set prompt terpandu',
  'Not loaded': 'Belum dimuat',
  'No product URL captured.': 'Tidak ada URL produk yang tersimpan.',
  'No brief selected': 'Tidak ada brief dipilih',
  'No ideation selected': 'Tidak ada ideasi dipilih',
  'No guided batch generated yet': 'Belum ada batch terpandu',
  'No ideation brief yet': 'Belum ada brief ideasi',
  'No saved briefs yet': 'Belum ada brief tersimpan',
  'No saved ideation yet': 'Belum ada ideasi tersimpan',
  'No saved ideation briefs exist yet.': 'Belum ada brief ideasi tersimpan.',
  'No saved ideation exists yet.': 'Belum ada ideasi tersimpan.',
  'No saved outputs exist for this session yet.':
    'Belum ada output tersimpan untuk sesi ini.',
  'No saved media exists for this media set yet.':
    'Belum ada media tersimpan untuk set media ini.',
  'No saved outputs yet': 'Belum ada output tersimpan',
  'No saved media yet': 'Belum ada media tersimpan',
  'No saved sessions exist yet. Finished generations will appear here.':
    'Belum ada sesi tersimpan. Hasil generasi yang selesai akan muncul di sini.',
  'No saved media sets exist yet. Finished generations will appear here.':
    'Belum ada set media tersimpan. Hasil generasi yang selesai akan muncul di sini.',
  'No session selected': 'Tidak ada sesi dipilih',
  'No media set selected': 'Tidak ada set media dipilih',
  'Offline': 'Offline',
  'Open Library': 'Buka Library',
  'OpenAI GPT Image 2 with 1K / 2K / 4K tiers':
    'OpenAI GPT Image 2 dengan tier 1K / 2K / 4K',
  'Open product page': 'Buka halaman produk',
  'Optional End Frame': 'Frame Akhir Opsional',
  'First Frame': 'Frame Pertama',
  'Optional enrichment for the page title, description, and product schema.':
    'Tambahan konteks opsional untuk judul halaman, deskripsi, dan schema produk.',
  'Only Veo uses end-frame guidance. Other models ignore this slot.':
    'Hanya Veo yang menggunakan panduan frame akhir. Model lain mengabaikan slot ini.',
  'Optional. Describe the offer, target buyer, campaign goal, and anything the concepts must emphasize. If left empty, ideation will infer strategy from the available image and page context.':
    'Opsional. Jelaskan penawaran, target pembeli, tujuan kampanye, dan poin yang ingin ditekankan. Jika dikosongkan, ideasi akan menyimpulkan strateginya dari gambar dan konteks halaman yang tersedia.',
  'Optional. Upload a single product image to give ideation direct visual context. Use PNG, JPG, JPEG, WEBP, or GIF.':
    'Opsional. Unggah satu gambar produk agar ideasi punya konteks visual yang lebih jelas. Gunakan PNG, JPG, JPEG, WEBP, atau GIF.',
  'Optional. When present, ideation enriches the brief with page metadata and schema from the live product page.':
    'Opsional. Jika diisi, ideasi akan melengkapi brief dengan metadata halaman dan schema dari halaman produk aktif.',
  'Output Language': 'Bahasa Output',
  'Controls the language used in the generated ideation brief.':
    'Mengatur bahasa yang digunakan dalam brief ideasi yang dihasilkan.',
  'Output': 'Output',
  'Output Quality': 'Kualitas hasil',
  'Outputs': 'Output',
  'Media': 'Media',
  'Orbit': 'Orbit',
  'Outdoor': 'Outdoor',
  'outdoor': 'outdoor',
  'People': 'Orang',
  'Pick the commercial framing before analysis.':
    'Pilih arah komersialnya sebelum analisis dijalankan.',
  'Person present or product-only.':
    'Ada orang atau hanya produk.',
  'Plan': 'Rencana',
  'Photography Style': 'Gaya fotografi',
  'Preview': 'Pratinjau',
  'Preset': 'Preset',
  'Primary input': 'Input utama',
  'Products': 'Produk',
  'Product Only': 'Produk Saja',
  'product-only': 'produk saja',
  'Product URL': 'URL Produk',
  'Product Category': 'Kategori produk',
  'Prompt Only': 'Hanya Prompt',
  'Prompt': 'Prompt',
  'Prompt set is ready. Generate the guided batch when the prompts look right.':
    'Set prompt sudah siap. Buat batch terpandu saat prompt sudah sesuai.',
  'Prompt-led short motion clips': 'Klip gerak singkat dari prompt',
  'Choose file': 'Pilih file',
  'Ready': 'Siap',
  'Ready for analysis': 'Siap untuk analisis',
  'Ready for ideation': 'Siap untuk ideasi',
  'Ready to analyze': 'Siap dianalisis',
  'Ready to Analyze': 'Siap Dianalisis',
  'Re-analyze': 'Analisis ulang',
  'Reference board': 'Papan referensi',
  'Reference 1': 'Referensi 1',
  'Reference 2': 'Referensi 2',
  'Reference 3': 'Referensi 3',
  'Review the missing requirement or provider error, then re-run the ideation pass from this control panel.':
    'Tinjau kebutuhan yang belum terpenuhi atau error dari provider, lalu jalankan ulang proses ideasi dari panel kontrol ini.',
  'Review the three concepts, then copy a single card or the full ideation brief.':
    'Tinjau tiga konsep, lalu salin satu kartu atau seluruh brief ideasi.',
  'References': 'Referensi',
  'Render output': 'Hasil render',
  'Review and run generation': 'Tinjau lalu jalankan generasi',
  'Review panel': 'Panel ringkasan',
  'Replace': 'Ganti',
  'Replace Guided Prompt Set?': 'Ganti Set Prompt Terpandu?',
  'Reset': 'Reset',
  'Reset Guided Mode': 'Reset mode terpandu',
  'Reset Ideation': 'Reset Ideasi',
  'Results': 'Hasil',
  'Run Status': 'Status Run',
  'Run the guided analysis first. The shot list will appear here as editable prompts.':
    'Jalankan analisis terpandu dulu. Daftar shot akan muncul di sini dan bisa langsung Anda edit.',
  'Saved briefs': 'Brief tersimpan',
  'Saved ideation': 'Ideasi tersimpan',
  'Saved concept set': 'Set konsep tersimpan',
  'Saved ideation brief': 'Brief ideasi tersimpan',
  'Saved outputs': 'Hasil tersimpan',
  'Saved media': 'Media tersimpan',
  'Senior': 'Senior',
  'Session': 'Sesi',
  'Media set': 'Set media',
  'Set the scene before generation.': 'Atur adegan sebelum generasi.',
  'Set the structured preset first, then add any optional free-form direction.':
    'Atur preset dasarnya lebih dulu, lalu tambahkan arahan bebas jika perlu.',
  'Sessions': 'Sesi',
  'Media sets': 'Set media',
  'Setup summary': 'Ringkasan setelan',
  'Shot Count': 'Jumlah shot',
  'Shot Environment': 'Lingkungan shot',
  'Studio, interior, curated indoor environment.':
    'Studio, interior, lingkungan indoor yang terkurasi.',
  'Subject Configuration': 'Konfigurasi subjek',
  'Stage every visual input here first. Keep the board fixed so people, styling, environment, and products remain easy to scan.':
    'Kumpulkan semua materi visual di sini terlebih dahulu. Biarkan susunannya tetap rapi agar orang, styling, lokasi, dan produk mudah ditinjau.',
  'Stage start-frame references here. Begin with Reference 1, then unlock the next card only when the selected model supports more visual guidance.':
    'Siapkan referensi frame awal di sini. Mulai dari Referensi 1, lalu buka kartu berikutnya hanya jika model yang dipilih mendukung panduan visual tambahan.',
  'hero': 'hero',
  'Staged assets': 'Aset tersiap',
  'Style & Environment': 'Gaya & Lingkungan',
  'Style': 'Gaya',
  'Subject': 'Subjek',
  'Sign out': 'Keluar',
  'Source input required': 'Sumber input diperlukan',
  'Step 1': 'Langkah 1',
  'Step 2': 'Langkah 2',
  'Studio': 'Studio',
  'Summary': 'Ringkasan',
  'Technical details': 'Detail teknis',
  'These prompt fields are the exact instructions sent into the guided render batch.':
    'Field prompt ini adalah instruksi persis yang dikirim ke batch render terpandu.',
  'This exact prompt is sent to the selected generation provider.':
    'Prompt ini dikirim persis ke provider generasi yang dipilih.',
  'Text and image-led still renders':
    'Render gambar diam berbasis teks dan gambar',
  'These settings stay after the reference board because they only matter once the input set and brief are established.':
    'Bagian ini ditempatkan setelah papan referensi karena baru relevan setelah materi input dan brief siap.',
  'The provider rejected this request.':
    'Provider menolak permintaan ini.',
  'The provider rejected the guided batch. Adjust the prompts or render settings and try again.':
    'Provider menolak batch terpandu. Sesuaikan prompt atau pengaturan render lalu coba lagi.',
  'The available hero image, product page context, and written brief are being converted into a fresh three-concept ideation brief.':
    'Gambar hero yang tersedia, konteks halaman produk, dan brief tertulis sedang diubah menjadi brief ideasi baru berisi tiga konsep.',
  'The current guided batch is still rendering. Cancel it first if you need to restart.':
    'Batch terpandu saat ini masih dirender. Batalkan terlebih dahulu jika Anda perlu memulai ulang.',
  'The final prompt set is rendered with the active image model.':
    'Set prompt akhir dirender dengan model gambar yang aktif.',
  'The final prompt set is rendered with the active video model.':
    'Set prompt akhir dirender dengan model video yang aktif.',
  'The hero product image is still required before you can generate the batch.':
    'Gambar produk hero masih diperlukan sebelum Anda dapat menghasilkan batch.',
  'The latest three-concept brief is saved in Results. Re-run analysis whenever you want to replace it.':
    'Brief tiga konsep terbaru disimpan di tab Hasil. Jalankan ulang analisis kapan pun Anda ingin menggantinya.',
  'The required inputs are ready. Run ideation to generate the first saved three-concept brief.':
    'Semua materi yang dibutuhkan sudah siap. Jalankan ideasi untuk membuat brief tiga konsep pertama.',
  'This variation is still waiting on the provider. The panel refreshes automatically while generation is active.':
    'Variasi ini masih menunggu provider. Panel akan diperbarui otomatis selama generasi aktif.',
  'Tune video behavior': 'Atur perilaku video',
  'Upload End Frame': 'Unggah Frame Akhir',
  'Upload Image': 'Unggah Gambar',
  'Upload image or video': 'Unggah gambar atau video',
  'Upload the hero product image to unlock guided analysis.':
    'Unggah gambar produk utama untuk membuka analisis terpandu.',
  'Upload the hero product image': 'Unggah gambar produk utama',
  'Upload the hero product, add any page context, then generate the initial shot list before editing the prompts.':
    'Unggah gambar produk utama, tambahkan konteks halaman bila perlu, lalu buat daftar shot awal sebelum mengedit prompt.',
  'Upload a hero product image, add the product page, and describe the campaign direction before ideation builds the three saved concepts. At least one source input is required.':
    'Unggah gambar produk utama, tambahkan halaman produk, lalu jelaskan arah kampanyenya sebelum ideasi menyusun tiga konsep tersimpan. Minimal satu sumber materi diperlukan.',
  'Upload the hero product, add any page context, then generate the first guided shot plan. Re-analyze any time you need a different direction.':
    'Unggah gambar produk utama, tambahkan konteks halaman bila perlu, lalu buat rencana shot terpandu pertama. Jalankan analisis ulang kapan saja jika Anda butuh arah yang berbeda.',
  'Upload the single product image that anchors the guided shot plan. Use PNG, JPG, JPEG, WEBP, or GIF.':
    'Unggah satu gambar produk yang akan menjadi acuan rencana shot terpandu. Gunakan PNG, JPG, JPEG, WEBP, atau GIF.',
  'Use an optional hero image when you want ideation grounded in the product\'s visible packaging, texture, or styling.':
    'Gunakan gambar utama opsional jika Anda ingin ideasi lebih selaras dengan kemasan, tekstur, atau styling produk yang terlihat.',
  'Use this only for direction that does not fit the preset controls.':
    'Gunakan ini hanya untuk arahan yang tidak sesuai dengan kontrol preset.',
  'Add a final frame for video models that support first-and-last-frame guidance.':
    'Tambahkan frame akhir untuk model video yang mendukung panduan frame awal-dan-akhir.',
  'ByteDance 8s or 12s pro video generation':
    'Generasi video ByteDance 8d atau 12d pro',
  'Clip length passed to models that expose duration controls.':
    'Durasi klip yang diteruskan ke model yang menyediakan kontrol durasi.',
  'Curated provider options for the active workspace.':
    'Pilihan model yang sudah disesuaikan untuk workspace ini.',
  'High-level visual language.': 'Bahasa visual tingkat tinggi.',
  'Reference and end-frame video renders':
    'Render video berbasis referensi dan frame akhir',
  'Video model': 'Model video',
  'Video': 'Video',
  'Video Duration': 'Durasi video',
  'Video resolution': 'Resolusi video',
  'Video session': 'Sesi video',
  'Video media set': 'Set media video',
  'Video workspace': 'Workspace video',
  'Visual direction:': 'Arah visual:',
  'Resolution preference for the guided run.':
    'Preferensi resolusi untuk run terpandu.',
  'Waiting for Input': 'Menunggu Input',
  'Written Brief': 'Brief Tertulis',
  'Written brief': 'Brief tertulis',
  'Workspaces': 'Workspace',
  'Your local references are ready. Review this panel, then run generation from the footer below.':
    'Referensi lokal Anda sudah siap. Tinjau panel ini, lalu jalankan generasi dari panel di samping.',
  'You can replace the hero image before re-analyzing or rendering again.':
    'Anda dapat mengganti gambar hero sebelum menganalisis ulang atau merender lagi.',
  'You can analyze with a hero image, a product URL, or both together.':
    'Anda dapat menganalisis dengan gambar hero, URL produk, atau keduanya sekaligus.',
  'You can replace the hero image before analyzing again.':
    'Anda dapat mengganti gambar hero sebelum menganalisis ulang.',
  'Waiting for Analysis': 'Menunggu Analisis',
  'Rendering': 'Merender',
  'Partial': 'Parsial',
  'Failed': 'Gagal',
  'Cancelled': 'Dibatalkan',
  'Ready to Render': 'Siap Dirender',
  'Shot plan is ready': 'Rencana shot siap',
  'No shot plan yet': 'Belum ada rencana shot',
  'Analyze the hero product first. The prompt set and render controls will stay coordinated here.':
    'Analisis produk hero terlebih dahulu. Set prompt dan kontrol render akan tetap terkoordinasi di sini.',
  'Guided batch cancelled': 'Batch terpandu dibatalkan',
  'Any completed results remain available below. Update the prompts or settings before running again.':
    'Hasil yang sudah selesai tetap tersedia di bawah. Perbarui prompt atau pengaturan sebelum menjalankan lagi.',
  'Completed results are ready below. Adjust any weak prompts before generating again.':
    'Hasil yang selesai sudah siap di bawah. Sesuaikan prompt yang lemah sebelum menghasilkan lagi.',
  'Review the saved outputs below or adjust the prompts and generate another batch.':
    'Tinjau output tersimpan di bawah atau sesuaikan prompt dan buat batch lain.',
  'Checking estimate': 'Memeriksa estimasi',
  'Estimate unavailable': 'Estimasi tidak tersedia',
}

export function translateText(locale: Locale, value: string): string {
  if (locale !== 'id') {
    return value
  }

  const directTranslation = uiTranslations[value]

  if (directTranslation) {
    return directTranslation
  }

  const loadedMatch = value.match(/^(\d+)\s+Loaded$/)

  if (loadedMatch) {
    return `${loadedMatch[1]} dimuat`
  }

  const stagedMatch = value.match(/^(\d+)\s+references staged for rendering$/)

  if (stagedMatch) {
    return `${stagedMatch[1]} referensi siap untuk dirender`
  }

  const completeMatch = value.match(/^(\d+)\/(\d+)\s+complete$/)

  if (completeMatch) {
    return `${completeMatch[1]}/${completeMatch[2]} selesai`
  }

  const failedMatch = value.match(/^(\d+)\s+failed$/)

  if (failedMatch) {
    return `${failedMatch[1]} gagal`
  }

  const activeMatch = value.match(/^(\d+)\s+active$/)

  if (activeMatch) {
    return `${activeMatch[1]} aktif`
  }

  const variationMatch = value.match(/^Variation\s+(\d+)$/)

  if (variationMatch) {
    return `Variasi ${variationMatch[1]}`
  }

  const shotLabelMatch = value.match(/^Shot\s+(\d+)$/)

  if (shotLabelMatch) {
    return `Shot ${shotLabelMatch[1]}`
  }

  const shotCountMatch = value.match(/^(\d+)\s+shot(s)?$/)

  if (shotCountMatch) {
    return `${shotCountMatch[1]} shot`
  }

  const editablePromptMatch = value.match(/^(\d+)\s+editable prompt(s)?$/)

  if (editablePromptMatch) {
    return `${editablePromptMatch[1]} prompt yang dapat diedit`
  }

  const variationCountMatch = value.match(/^(\d+)\s+variation(s)?$/)

  if (variationCountMatch) {
    return `${variationCountMatch[1]} variasi`
  }

  const estimatedCreditsMatch = value.match(/^Estimated:\s+(.+)\s+credits$/)

  if (estimatedCreditsMatch) {
    return `Estimasi: ${estimatedCreditsMatch[1]} kredit`
  }
  return value
}
