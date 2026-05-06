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
        library: 'Library',
        signOut: 'Sign out',
        signedIn: 'Signed in',
        studio: 'Studio',
      },
    },
  },
  id: {
    auth: {
      backToSignIn: 'Kembali masuk',
      configureSupabase:
        'Konfigurasikan SUPABASE_URL dan SUPABASE_ANON_KEY sebelum menggunakan autentikasi.',
      confirmPassword: 'Konfirmasi kata sandi',
      confirmPasswordPlaceholder: 'Konfirmasi kata sandi baru',
      createNewPassword: 'Buat kata sandi baru',
      email: 'Email',
      forgotPassword: 'Lupa kata sandi?',
      messages: {
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
      signInTitle: 'Masuk ke studio Anda',
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
      title: 'Pustaka',
    },
    notFound: {
      body:
        'Kembali ke ruang kerja studio dan lanjutkan konfigurasi alur generasi Anda.',
      cta: 'Kembali ke Workspace',
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
        library: 'Pustaka',
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
  'A hero product image is required.': 'Gambar produk hero wajib ditambahkan.',
  'A hero image is required before guided analysis can begin.':
    'Gambar hero wajib ditambahkan sebelum analisis terpandu dimulai.',
  'Add a hero product image or a product URL first.':
    'Tambahkan gambar produk hero atau URL produk terlebih dahulu.',
  'Add a hero product image or a product URL.':
    'Tambahkan gambar produk hero atau URL produk.',
  'Add a reference image or describe the image prompt first.':
    'Tambahkan gambar referensi atau jelaskan prompt gambar terlebih dahulu.',
  'Add a start-frame reference or describe the motion prompt first.':
    'Tambahkan referensi frame awal atau jelaskan prompt gerakan terlebih dahulu.',
  'Add at least one source input, run analysis, and the saved three-card brief will appear here.':
    'Tambahkan minimal satu sumber input, jalankan analisis, lalu brief tiga kartu yang tersimpan akan muncul di sini.',
  'Add at least one source input. Ideation can run from a hero image, a product URL, or both together.':
    'Tambahkan minimal satu sumber input. Ideasi dapat berjalan dari gambar hero, URL produk, atau keduanya.',
  'Affiliate': 'Afiliasi',
  'Analyze': 'Analisis',
  'Analyze Content Ideation': 'Analisis Ideasi Konten',
  'Analyze input': 'Analisis input',
  'Analyzing': 'Menganalisis',
  'Analyzing Ideation Brief...': 'Menganalisis Brief Ideasi...',
  'Archive': 'Arsip',
  'Archive size': 'Ukuran arsip',
  'Audience:': 'Audiens:',
  'Back to Workspace': 'Kembali ke Workspace',
  'Brief': 'Brief',
  'Briefs': 'Brief',
  'Build the reference board first, or use the written brief if you need a prompt-only run.':
    'Bangun papan referensi terlebih dahulu, atau gunakan brief tertulis jika Anda membutuhkan run berbasis prompt saja.',
  'Building a new ideation brief': 'Membangun brief ideasi baru',
  'Cancel': 'Batal',
  'Cancel Guided Run': 'Batalkan Run Terpandu',
  'Clear': 'Hapus',
  'Close': 'Tutup',
  'Concept': 'Konsep',
  'Confirm': 'Konfirmasi',
  'Content Concept': 'Konsep Konten',
  'Copy': 'Salin',
  'Copy card': 'Salin kartu',
  'Copy full brief': 'Salin brief lengkap',
  'Copied': 'Tersalin',
  'CTA:': 'CTA:',
  'Delete': 'Hapus',
  'Delete output?': 'Hapus output?',
  'Delete session?': 'Hapus sesi?',
  'Download': 'Unduh',
  'Driven Ads': 'Iklan Performa',
  'Email or password is incorrect. Try again or reset your password.':
    'Email atau kata sandi salah. Coba lagi atau reset kata sandi Anda.',
  'Estimated cost': 'Estimasi biaya',
  'Generate Guided Batch': 'Buat Batch Terpandu',
  'Generate the ideation brief': 'Buat brief ideasi',
  'Generated results': 'Hasil generasi',
  'Generating Guided Batch...': 'Membuat Batch Terpandu...',
  'Guided': 'Terpandu',
  'Hero Product': 'Produk Hero',
  'Hook:': 'Hook:',
  'Ideation': 'Ideasi',
  'Ideation analysis needs another pass': 'Analisis ideasi perlu dijalankan lagi',
  'Ideation brief': 'Brief ideasi',
  'Ideation brief is ready': 'Brief ideasi siap',
  'Image': 'Gambar',
  'Inputs are ready': 'Input siap',
  'Key message:': 'Pesan utama:',
  'KIE Analysis Model': 'Model Analisis KIE',
  'KIE Credits': 'Kredit KIE',
  'Latest save': 'Simpanan terbaru',
  'Library': 'Pustaka',
  'Manual': 'Manual',
  'Needs Attention': 'Perlu Perhatian',
  'No brief selected': 'Tidak ada brief dipilih',
  'No guided batch generated yet': 'Belum ada batch terpandu',
  'No ideation brief yet': 'Belum ada brief ideasi',
  'No saved briefs yet': 'Belum ada brief tersimpan',
  'No saved ideation briefs exist yet.': 'Belum ada brief ideasi tersimpan.',
  'No saved outputs yet': 'Belum ada output tersimpan',
  'No session selected': 'Tidak ada sesi dipilih',
  'Offline': 'Offline',
  'Open product page': 'Buka halaman produk',
  'Output Language': 'Bahasa Output',
  'Controls the language used in the generated ideation brief.':
    'Mengatur bahasa yang digunakan dalam brief ideasi yang dihasilkan.',
  'Output': 'Output',
  'Outputs': 'Output',
  'Plan': 'Rencana',
  'Preview': 'Pratinjau',
  'Product URL': 'URL Produk',
  'Ready': 'Siap',
  'Ready for analysis': 'Siap untuk analisis',
  'Ready for ideation': 'Siap untuk ideasi',
  'Ready to Analyze': 'Siap Dianalisis',
  'References': 'Referensi',
  'Replace': 'Ganti',
  'Reset Ideation': 'Reset Ideasi',
  'Results': 'Hasil',
  'Run Status': 'Status Run',
  'Saved briefs': 'Brief tersimpan',
  'Saved concept set': 'Set konsep tersimpan',
  'Saved ideation brief': 'Brief ideasi tersimpan',
  'Saved outputs': 'Output tersimpan',
  'Session': 'Sesi',
  'Sessions': 'Sesi',
  'Sign out': 'Keluar',
  'Source input required': 'Sumber input diperlukan',
  'Step 1': 'Langkah 1',
  'Step 2': 'Langkah 2',
  'Studio': 'Studio',
  'Summary': 'Ringkasan',
  'Technical details': 'Detail teknis',
  'Upload Image': 'Unggah Gambar',
  'Upload the hero product image': 'Unggah gambar produk hero',
  'Video': 'Video',
  'Visual direction:': 'Arah visual:',
  'Waiting for Input': 'Menunggu Input',
  'Written Brief': 'Brief Tertulis',
  'Written brief': 'Brief tertulis',
}

export function translateText(locale: Locale, value: string): string {
  return locale === 'id' ? (uiTranslations[value] ?? value) : value
}
