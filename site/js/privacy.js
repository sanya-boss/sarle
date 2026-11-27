/* Privacy policy modal (EN / ET / RU), opened by any [data-privacy] link. */
(function () {
  var MAIL = '<a href="mailto:gallery@sarle.ee">gallery@sarle.ee</a>';
  var AKI = '<a href="https://www.aki.ee/" target="_blank" rel="noopener">aki.ee</a>';
  var TEXT = {
    en: {
      close: 'Close',
      html:
        '<h2>Privacy policy</h2>' +
        '<p class="pp-date">Last updated: 21 November 2026.</p>' +
        '<p>Sarle Art Gallery &amp; Studio respects your privacy and processes personal data in accordance with the EU General Data Protection Regulation (GDPR).</p>' +
        '<h3>1. Who is responsible for processing</h3>' +
        '<p><strong>Controller: Sarle Art Gallery &amp; Studio.</strong><br>Address: Aia tn 17, Tallinn, Estonia.<br>Email: ' + MAIL + '.</p>' +
        '<h3>2. What data we use and why</h3>' +
        '<p>When you contact us, we use the contact details and message content you provide to reply to your enquiry and handle your request. The legal basis is our legitimate interest in communicating with visitors and, for purchase or service enquiries, preparing or performing a contract.</p>' +
        '<p><strong>Newsletter.</strong> If you subscribe, we store your email, the date of subscription and the language of the site, and use them to send news about exhibitions and events on the basis of your consent. You can withdraw consent at any time by writing to ' + MAIL + '. This does not affect the lawfulness of processing before withdrawal.</p>' +
        '<p><strong>Open Call 2027 applications.</strong> If you apply, we use the information you enter in the form: your name or artist name, email, country and city, social media and website links, portfolio link, your answers about your artistic practice, exhibition experience, artist statement, interests and motivation, your confirmations, and the language and page of the site. We use it to review your application, select artists for exhibitions and gallery projects, and contact you about your application and the next steps. The legal basis is taking steps at your request before a possible collaboration and our legitimate interest in organising the selection. Fields marked * are needed to consider the application; the others are optional.</p>' +
        '<p>Applications are reviewed by the gallery team; no decisions are made automatically. We only look at the works you link to; we do not copy or publish them without your separate permission.</p>' +
        '<h3>3. Technical data and third-party services</h3>' +
        '<p>The website uses GitHub Pages, Google Fonts and Google Maps. When the site loads, these services may receive your IP address, browser information and other technical data. Google Maps may also use cookies.</p>' +
        '<p>To protect the newsletter and application forms from spam, they use Cloudflare Turnstile. It appears after you enter your email and checks technical data about your browser and device to tell people from bots.</p>' +
        '<p>Newsletter sign-ups and Open Call applications are sent through Google Apps Script and stored in a Google Sheets spreadsheet with restricted access in the gallery&rsquo;s Google account; the gallery is notified of new applications by email (Gmail). Google acts as our service provider.</p>' +
        '<p>Processing by these services is governed by their own privacy policies and may take place outside the European Economic Area. Where consent is required for optional cookies, it is requested separately.</p>' +
        '<h3>4. Sharing and retention</h3>' +
        '<p>We do not sell your personal data. It may be accessed by service providers needed to run the website and communicate with you, and by competent authorities where required by law.</p>' +
        '<p>We keep correspondence for as long as needed to handle the enquiry and resolve related matters. Newsletter data is kept until consent is withdrawn. Open Call applications are kept for the selection and for up to two years after Open Call 2027 closes, so that we can consider you for future exhibitions; you can ask us to delete your application earlier. Where the law requires longer retention of certain documents, the statutory period applies.</p>' +
        '<h3>5. Your rights</h3>' +
        '<p>Where provided by law, you may request access to your data, its rectification, erasure, restriction of processing or portability, and object to processing. To do so, write to ' + MAIL + '.</p>' +
        '<p>You also have the right to lodge a complaint with the Estonian Data Protection Inspectorate — Andmekaitse Inspektsioon: ' + AKI + '.</p>' +
        '<h3>6. Changes to this policy</h3>' +
        '<p>We may update this policy. The current version is always published on this page.</p>'
    },
    et: {
      close: 'Sulge',
      html:
        '<h2>Privaatsuspoliitika</h2>' +
        '<p class="pp-date">Viimati uuendatud: 21. november 2026.</p>' +
        '<p>Sarle Art Gallery &amp; Studio austab teie privaatsust ja töötleb isikuandmeid kooskõlas ELi isikuandmete kaitse üldmäärusega (GDPR).</p>' +
        '<h3>1. Kes vastutab andmete töötlemise eest</h3>' +
        '<p><strong>Vastutav töötleja: Sarle Art Gallery &amp; Studio.</strong><br>Aadress: Aia tn 17, Tallinn, Eesti.<br>E-post: ' + MAIL + '.</p>' +
        '<h3>2. Milliseid andmeid me kasutame ja miks</h3>' +
        '<p>Kui võtate meiega ühendust, kasutame teie esitatud kontaktandmeid ja sõnumi sisu, et pöördumisele vastata ja päringut menetleda. Õiguslikuks aluseks on meie õigustatud huvi külastajatega suhelda ning ostu- või teenusepäringute puhul lepingu ettevalmistamine või täitmine.</p>' +
        '<p><strong>Uudiskiri.</strong> Kui tellite uudiskirja, salvestame teie e-posti aadressi, tellimise kuupäeva ja saidi keele ning kasutame neid näituste ja ürituste uudiste saatmiseks teie nõusoleku alusel. Nõusoleku saate igal ajal tagasi võtta, kirjutades aadressil ' + MAIL + '. See ei mõjuta enne tagasivõtmist toimunud töötlemise seaduslikkust.</p>' +
        '<p><strong>Open Call 2027 taotlused.</strong> Kui kandideerite, kasutame vormi sisestatud andmeid: teie nime või kunstnikunime, e-posti aadressi, riiki ja linna, sotsiaalmeedia ja veebisaidi linke, portfoolio linki, vastuseid teie loomingulise praktika, näitusekogemuse, kunstnikuavalduse, huvide ja motivatsiooni kohta, teie kinnitusi ning saidi keelt ja lehte. Kasutame neid taotluse läbivaatamiseks, kunstnike valimiseks näitustele ja galerii projektidesse ning teiega taotluse ja järgmiste sammude asjus ühenduse võtmiseks. Õiguslikuks aluseks on teie soovil võimaliku koostöö eelsete sammude astumine ja meie õigustatud huvi valikut korraldada. Tärniga * tähistatud väljad on taotluse läbivaatamiseks vajalikud, ülejäänud on vabatahtlikud.</p>' +
        '<p>Taotlused vaatab läbi galerii meeskond; automaatseid otsuseid ei tehta. Vaatame ainult teoseid, millele viitate; me ei kopeeri ega avalda neid ilma teie eraldi loata.</p>' +
        '<h3>3. Tehnilised andmed ja kolmandate osapoolte teenused</h3>' +
        '<p>Veebisaidi toimimiseks kasutatakse GitHub Pagesi, Google Fontsi ja Google Mapsi. Saidi laadimisel võivad need teenused saada teie IP-aadressi, brauseri andmed ja muud tehnilised andmed. Google Maps võib kasutada ka küpsiseid.</p>' +
        '<p>Uudiskirja ja taotlusvormi kaitsmiseks rämpsposti eest kasutatakse Cloudflare Turnstile’i. See ilmub pärast e-posti aadressi sisestamist ja kontrollib teie brauseri ja seadme tehnilisi andmeid, et eristada inimesi robotitest.</p>' +
        '<p>Uudiskirja tellimused ja Open Calli taotlused saadetakse Google Apps Scripti kaudu ning salvestatakse piiratud juurdepääsuga Google Sheetsi tabelisse galerii Google\'i kontol; uutest taotlustest teavitatakse galeriid e-postiga (Gmail). Google tegutseb meie teenusepakkujana.</p>' +
        '<p>Nende teenuste poolset andmetöötlust reguleerivad nende endi privaatsuspoliitikad ning see võib toimuda väljaspool Euroopa Majanduspiirkonda. Kui valikuliste küpsiste kasutamiseks on vaja nõusolekut, küsitakse seda eraldi.</p>' +
        '<h3>4. Andmete edastamine ja säilitamine</h3>' +
        '<p>Me ei müü teie isikuandmeid. Neile võivad juurde pääseda veebisaidi toimimiseks ja teiega suhtlemiseks vajalikud teenusepakkujad ning seaduses sätestatud juhtudel pädevad asutused.</p>' +
        '<p>Kirjavahetust säilitame pöördumise menetlemise ja sellega seotud küsimuste lahendamise ajal. Uudiskirja andmeid säilitame kuni nõusoleku tagasivõtmiseni. Open Calli taotlusi säilitame valiku ajal ja kuni kaks aastat pärast Open Call 2027 lõppu, et saaksime teid tulevaste näituste puhul arvesse võtta; taotluse varasemat kustutamist võite igal ajal paluda. Kui seadus nõuab teatud dokumentide pikemat säilitamist, kohaldatakse seadusega kehtestatud tähtaega.</p>' +
        '<h3>5. Teie õigused</h3>' +
        '<p>Seaduses sätestatud juhtudel võite taotleda juurdepääsu oma andmetele, nende parandamist, kustutamist, töötlemise piiramist või ülekandmist ning esitada vastuväite töötlemisele. Selleks kirjutage aadressil ' + MAIL + '.</p>' +
        '<p>Teil on ka õigus esitada kaebus Andmekaitse Inspektsioonile: ' + AKI + '.</p>' +
        '<h3>6. Poliitika muudatused</h3>' +
        '<p>Võime seda poliitikat uuendada. Kehtiv versioon avaldatakse alati sellel lehel.</p>'
    },
    ru: {
      close: 'Закрыть',
      html:
        '<h2>Политика конфиденциальности</h2>' +
        '<p class="pp-date">Последнее обновление: 21 ноября 2026 года.</p>' +
        '<p>Sarle Art Gallery &amp; Studio уважает вашу конфиденциальность и обрабатывает персональные данные в соответствии с Общим регламентом ЕС о защите данных (GDPR).</p>' +
        '<h3>1. Кто отвечает за обработку данных</h3>' +
        '<p><strong>Ответственный за обработку: Sarle Art Gallery &amp; Studio.</strong><br>Адрес: Aia tn 17, Tallinn, Estonia.<br>Электронная почта: ' + MAIL + '.</p>' +
        '<h3>2. Какие данные мы используем и зачем</h3>' +
        '<p>Когда вы связываетесь с нами, мы используем предоставленные вами контактные данные и содержание сообщения, чтобы ответить на обращение и обработать запрос. Основанием является наш законный интерес в общении с посетителями, а для запросов о покупке или услугах — подготовка или исполнение договора.</p>' +
        '<p><strong>Рассылка.</strong> Если вы подписываетесь, мы храним ваш email, дату подписки и язык сайта и используем их для отправки новостей о выставках и мероприятиях на основании вашего согласия. Отозвать согласие можно в любое время, написав на ' + MAIL + '. Это не влияет на законность обработки до отзыва.</p>' +
        '<p><strong>Заявки Open Call 2027.</strong> Если вы подаёте заявку, мы используем данные, которые вы указали в форме: имя или имя художника, email, страну и город, ссылки на соцсети и сайт, ссылку на портфолио, ответы о творческой практике, опыте выставок, artist statement, интересах и мотивации, ваши подтверждения, а также язык и страницу сайта. Мы используем их, чтобы рассмотреть заявку, отобрать художников для выставок и проектов галереи и связаться с вами по поводу заявки и дальнейших шагов. Основание — действия по вашему запросу до возможного сотрудничества и наш законный интерес в проведении отбора. Поля, отмеченные *, нужны для рассмотрения заявки, остальные — по желанию.</p>' +
        '<p>Заявки рассматривает команда галереи, автоматических решений не принимается. Мы только просматриваем работы по ссылкам, которые вы указали, и не копируем и не публикуем их без вашего отдельного разрешения.</p>' +
        '<h3>3. Технические данные и сторонние сервисы</h3>' +
        '<p>Для работы сайта используются GitHub Pages, Google Fonts и Google Maps. При загрузке сайта эти сервисы могут получать ваш IP-адрес, сведения о браузере и другие технические данные. Google Maps также может использовать файлы cookie.</p>' +
        '<p>Чтобы защитить формы подписки и заявок от спама, используется Cloudflare Turnstile. Он появляется после ввода email и проверяет технические данные о браузере и устройстве, чтобы отличить человека от робота.</p>' +
        '<p>Подписки на рассылку и заявки Open Call передаются через Google Apps Script и хранятся в таблице Google Sheets с ограниченным доступом в аккаунте Google галереи; о новых заявках галерея получает уведомление по электронной почте (Gmail). Google выступает нашим поставщиком услуг.</p>' +
        '<p>Обработка данных такими сервисами регулируется их политиками конфиденциальности и может происходить за пределами Европейской экономической зоны. Если для использования необязательных файлов cookie требуется согласие, оно запрашивается отдельно.</p>' +
        '<h3>4. Передача и хранение данных</h3>' +
        '<p>Мы не продаём ваши персональные данные. Доступ к ним могут получать поставщики услуг, необходимые для работы сайта и связи с вами, а также уполномоченные органы в предусмотренных законом случаях.</p>' +
        '<p>Переписку мы храним на период рассмотрения обращения и последующего решения связанных с ним вопросов. Данные для рассылки — до отзыва согласия. Заявки Open Call храним на время отбора и до двух лет после окончания Open Call 2027, чтобы рассматривать вас для будущих выставок; вы можете попросить удалить заявку раньше. Если закон требует более длительного хранения отдельных документов, применяется установленный законом срок.</p>' +
        '<h3>5. Ваши права</h3>' +
        '<p>В предусмотренных законом случаях вы можете запросить доступ к своим данным, их исправление, удаление, ограничение обработки или переносимость, а также возразить против обработки. Для этого напишите на ' + MAIL + '.</p>' +
        '<p>Вы также вправе подать жалобу в Инспекцию по защите данных Эстонии — Andmekaitse Inspektsioon: ' + AKI + '.</p>' +
        '<h3>6. Изменения политики</h3>' +
        '<p>Мы можем обновлять эту политику. Актуальная версия всегда публикуется на этой странице.</p>'
    }
  };

  var modal, body, closeBtn, lastFocus;
  function build() {
    modal = document.createElement('div');
    modal.className = 'pp-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('data-no-translate', '');
    modal.innerHTML = '<div class="pp-panel"><button type="button" class="pp-close"></button><div class="pp-body"></div></div>';
    body = modal.querySelector('.pp-body');
    closeBtn = modal.querySelector('.pp-close');
    closeBtn.addEventListener('click', close);
    modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && modal.classList.contains('is-open')) close(); });
    document.body.appendChild(modal);
  }
  function open(e) {
    if (e) e.preventDefault();
    if (!modal) build();
    var l = document.documentElement.lang;
    var T = TEXT[l] || TEXT.en;
    body.innerHTML = T.html;
    closeBtn.textContent = '\u00d7';
    closeBtn.setAttribute('aria-label', T.close);
    lastFocus = document.activeElement;
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    modal.querySelector('.pp-panel').scrollTop = 0;
    closeBtn.focus();
  }
  function close() {
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('[data-privacy]') : null;
    if (a) open(e);
  });
})();
