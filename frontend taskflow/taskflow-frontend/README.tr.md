# TaskFlow Frontend — Türkçe Kullanım Kılavuzu

TaskFlow, çalışma alanları, projeler ve görevler üzerinden ekip içi iş takibini denemek için hazırlanmış bir web uygulamasıdır. Arayüz React, TypeScript ve Vite ile geliştirilmiştir; veriler NestJS backend API’sinden alınır.

**Bu proje bir deneme ve ön gösterim çalışmasıdır.** Uygulamanın görünümünü ve temel kullanım akışlarını tanıtmayı amaçlar; tamamlanmış, üretim ortamına hazır bir ürün olarak sunulmaz.

İngilizce dokümantasyon: [README.md](README.md).

## Başlamadan önce

- Node.js 22.12+ veya uyumlu daha yeni bir sürüm ve npm kurulu olmalıdır.
- TaskFlow backend projesi ayrıca kurulmalı; veritabanı ve ortam ayarları backend’in kendi kurulum kılavuzuna göre hazırlanmalıdır.
- Bu depo yalnızca frontend’i içerir. Backend olmadan giriş, kayıt ve görev işlemleri kullanılamaz.

## Yerel ortamda çalıştırma

### 1. Backend’i başlat

Backend kurulumu tamamlandıktan sonra, backend projesinin klasöründe aşağıdaki komutu çalıştır. Mevcut geliştirme düzeninde bu klasör frontend’in yanındaki `../Login` klasörüdür; kendi dizin düzenine göre yolu değiştir.

```sh
npm run start:dev
```

Varsayılan API adresi: **http://localhost:3000**.

### 2. Frontend’i başlat

Ayrı bir terminal aç ve bu deponun kök klasöründe çalıştır:

```sh
npm ci
npm run dev
```

Tarayıcıda **http://localhost:3001** adresini aç. Backend’in CORS ayarlarıyla uyumlu olması için adresi `localhost` olarak kullan.

Windows PowerShell, npm betiğinin çalışmasını engelliyorsa komutları `npm.cmd ci` ve `npm.cmd run dev` şeklinde çalıştırabilirsin.

### 3. Gerekirse API adresini değiştir

`.env.example` dosyasını `.env.local` adıyla kopyala ve API adresini düzenle:

```dotenv
VITE_API_URL=http://localhost:3000
```

Değişiklikten sonra frontend geliştirme sunucusunu yeniden başlat. Backend’in CORS izinlerinde frontend adresinin de bulunması gerekir. `VITE_` değişkenleri tarayıcıya aktarılır; bu değişkenlere gizli anahtar veya parola ekleme.

## Uygulama nasıl kullanılır?

1. **Hesap oluştur veya giriş yap.** Kayıt ekranından bir hesap oluşturabilir ya da mevcut hesabınla giriş yapabilirsin.
2. **Çalışma alanı oluştur.** Ekibin veya kişisel çalışmaların için bir alan aç. Birden fazla alanın varsa aralarında geçiş yapabilirsin.
3. **Proje oluştur.** Seçili çalışma alanında bir proje aç ve istersen açıklama ekle.
4. **Görev ekle.** Görevin başlığını, açıklamasını, önceliğini ve son tarihini belirle. Görevi çalışma alanındaki bir üyeye atayabilirsin.
5. **İlerlemeyi güncelle.** Görevi açıp durumunu “Yapılacak”, “Devam ediyor”, “İncelemede” veya “Tamamlandı” olarak değiştir ve kaydet.
6. **Görevleri takip et.** Pano veya liste görünümünü kullan. Arama, durum, öncelik ve sana atanan görevler filtresiyle listeyi daraltabilir; sıralamayı değiştirebilirsin.
7. **Yorum ekle.** Kaydedilmiş bir görevin detayını açarak ekip konuşmasına not yazabilirsin.
8. **Ekibini yönet.** Yetkin varsa üyeler bölümünden kayıtlı bir kullanıcının e-posta adresiyle çalışma alanına üye ekleyebilirsin. Yönetim seçenekleri çalışma alanındaki rolüne göre değişir.
9. **Takvimi kullan.** Son tarihli görevleri aylık görünümde izle ve kartları günler arasında sürükleyerek tarihlerini değiştir.
10. **Görev ayrıntılarını zenginleştir.** Etiket, kontrol listesi ve dosya ekle; aktivite geçmişinden değişiklikleri izle.
11. **Bildirimleri ve raporları takip et.** Atama ve yorum bildirimlerini üst menüden, ekip ilerlemesini Raporlar ekranından görüntüle.
12. **İş akışını düzenle.** Alt görevler oluştur, görevleri günlük, haftalık veya aylık tekrar edecek şekilde ayarla ve tamamlanan işleri arşivle.
13. **Verileri yönet.** Arşiv ve çöp kutusundan görevleri geri yükle, çalışma alanını CSV olarak dışa aktar ve karanlık temayı üst menüden aç.
14. **Ekibi davet et.** E-posta davet bağlantısını kopyala veya e-posta uygulamanda aç; bağlantı 7 gün geçerlidir.
15. **Her yerde ara.** Üst menüdeki arama düğmesiyle seçili çalışma alanındaki proje, görev, yorum ve ekip üyelerini birlikte ara.
16. **Temanı seç.** Üst menüden Aydınlık, Karanlık, Okyanus, Gün batımı veya Lavanta temasını seç; tercih tarayıcıda saklanır.
17. **Hatırlatmaları takip et.** Son tarihi yaklaşan ve geciken görev bildirimlerini bildirim merkezinden aç.

İlk deneme için bir çalışma alanı, bir proje ve bir görev oluştur; ardından görevin durumunu değiştirip yorum ekleyerek temel akışı incele.

## Demo hesabıyla deneme

Backend’in örnek veri yükleme (seed) işlemi tamamlandıysa şu hesap kullanılabilir:

| Alan | Değer |
| --- | --- |
| E-posta | `alice@example.com` |
| Şifre | `TaskFlowDemo1!` |

Giriş ekranındaki demo düğmesi **yalnızca giriş formunu doldurur**. Oturum açmak için giriş işlemini ayrıca göndermelisin. Bu düğme demo hesabı veya örnek veri oluşturmaz. Hesap bulunamıyorsa backend kılavuzundaki seed adımlarını uygula ya da yeni bir hesap oluştur.

## Ön gösterimin kapsamı

- Veriler gerçek API’den gelir. Oluşturma, düzenleme ve silme işlemleri bağlı backend’deki verileri değiştirir; ön gösterim otomatik sıfırlanan bir deneme alanı değildir.
- Yeni hesaplarda çalışma alanı ve proje listeleri boş olabilir. Giriş ekranındaki dekoratif çizim, hesabına ait veri değildir.
- Oturum bilgileri sekme bazında `sessionStorage` içinde tutulur. Üretim kullanımı öncesinde kimlik doğrulama ve dağıtım yapılandırması ayrıca değerlendirilmelidir.
- Frontend ve backend ayrı depolardır. Depoyu GitHub’da paylaşmak uygulamayı internette çalışan bir siteye dönüştürmez; canlı kullanım için iki tarafın da ayrıca dağıtılması gerekir.

## Diğer komutlar

| Komut | Açıklama |
| --- | --- |
| `npm run dev` | Yerel geliştirme sunucusunu başlatır. |
| `npm run build` | TypeScript kontrolünü yapar ve dağıtım dosyalarını üretir. |
| `npm run preview` | Önceden oluşturulan build çıktısını yerelde ön gösterir. Önce `npm run build` çalıştırılmalıdır; API işlemleri için backend yine gereklidir. |
| `npm test` | Mevcut testleri çalıştırır. |

## Sık karşılaşılan sorunlar

- **Sunucuya bağlanılamıyor:** Backend’in çalıştığını ve `VITE_API_URL` adresinin doğru olduğunu kontrol et.
- **CORS hatası:** Frontend’i `http://localhost:3001` adresinden aç ve backend’in bu adrese izin verdiğini kontrol et.
- **3001 portu kullanımda:** Bu portu kullanan diğer geliştirme sunucusunu durdurup tekrar dene.
- **Demo girişi başarısız:** Backend’de örnek hesabın seed işlemiyle oluşturulduğundan emin ol.
- **Üye eklenemiyor:** Eklemek istediğin kişinin önce TaskFlow hesabı oluşturması gerekir. Ayrıca çalışma alanındaki yetkini kontrol et.

## Dosya yapısı

- `src/App.tsx`: Çalışma alanları, pano/liste görünümü, üyeler ve ayarlar.
- `src/Auth.tsx`: Giriş ve kayıt ekranları.
- `src/TaskDialog.tsx`: Görev düzenleme ve yorumlar.
- `src/Forms.tsx`: Çalışma alanı, proje, üye ve profil formları.
- `src/api.ts`: API istekleri ve oturum yönetimi.
- `src/components.tsx`: Ortak arayüz bileşenleri.
- `src/styles.css`: Görsel stiller ve farklı ekran boyutlarına uyum.
