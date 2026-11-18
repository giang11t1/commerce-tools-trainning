import { useIntl } from 'react-intl';

export const german: Record<string, string> = {
  'The Product Labels upload URL is invalid.':
    'Die Upload-URL für Produktlabels ist ungültig.',
  'Configure an HTTPS upload URL ending in /api/product-labels/images. HTTP is allowed only for localhost or 127.0.0.1 in development.':
    'Konfigurieren Sie eine HTTPS-Upload-URL mit der Endung /api/product-labels/images. HTTP ist nur für localhost oder 127.0.0.1 in der Entwicklung zulässig.',
  'Local HTTP configuration is accepted for development, but Merchant Center forwarding requires a public HTTPS tunnel or deployed upload backend. File selection is enabled; uploading requires that HTTPS configuration.':
    'Lokales HTTP wird in der Entwicklung akzeptiert. Die Merchant-Center-Weiterleitung benötigt jedoch einen öffentlichen HTTPS-Tunnel oder ein bereitgestelltes Upload-Backend. Die Dateiauswahl ist aktiviert; für den Upload ist diese HTTPS-Konfiguration erforderlich.',
  'Merchant Center cannot forward uploads to HTTP localhost. Configure a public HTTPS tunnel or deployed upload backend in both applications.':
    'Merchant Center kann Uploads nicht an HTTP-localhost weiterleiten. Konfigurieren Sie in beiden Anwendungen einen öffentlichen HTTPS-Tunnel oder ein bereitgestelltes Upload-Backend.',
  'Preview uses current time. Save definition changes to update the storefront after cache refresh.':
    'Die Vorschau verwendet die aktuelle Uhrzeit. Speichern Sie Definitionsänderungen, um den Storefront nach der Cache-Aktualisierung zu aktualisieren.',
  'Label type': 'Labeltyp',
  Text: 'Text',
  Image: 'Bild',
  Position: 'Position',
  'top-left': 'Oben links',
  'top-right': 'Oben rechts',
  'bottom-left': 'Unten links',
  'bottom-right': 'Unten rechts',
  Scheduled: 'Geplant',
  Expired: 'Abgelaufen',
  'Position and schedule': 'Position und Zeitplan',
  'Start date and time': 'Startdatum und Uhrzeit',
  'End date and time': 'Enddatum und Uhrzeit',
  'Dates use your browser timezone and are stored in UTC. Start is inclusive; end is exclusive.':
    'Die Zeitzone Ihres Browsers wird verwendet; gespeichert wird UTC. Der Start ist inklusive, das Ende exklusive.',
  'Style configuration': 'Stileinstellungen',
  'Font size': 'Schriftgröße',
  'Font weight': 'Schriftstärke',
  'Font family': 'Schriftfamilie',
  'Padding X': 'Horizontaler Innenabstand',
  'Padding Y': 'Vertikaler Innenabstand',
  'Border width': 'Rahmenbreite',
  'Border style': 'Rahmenstil',
  'Border color': 'Rahmenfarbe',
  'Border radius': 'Eckenradius',
  'Letter spacing': 'Zeichenabstand',
  'Text transform': 'Groß-/Kleinschreibung',
  'Box shadow': 'Schatten',
  Opacity: 'Deckkraft',
  Rotation: 'Drehung',
  'Maximum width': 'Maximale Breite',
  Default: 'Standard',
  none: 'Keine',
  solid: 'Durchgezogen',
  dashed: 'Gestrichelt',
  dotted: 'Gepunktet',
  double: 'Doppelt',
  uppercase: 'Großbuchstaben',
  lowercase: 'Kleinbuchstaben',
  capitalize: 'Wortanfänge groß',
  'Advanced CSS': 'Erweitertes CSS',
  'Only supported declarations are allowed. Selectors, URLs, variables and !important are rejected.':
    'Nur unterstützte Deklarationen sind zulässig. Selektoren, URLs, Variablen und !important werden abgelehnt.',
  'Image unavailable': 'Bild nicht verfügbar',
  'Label image': 'Labelbild',
  'Upload image': 'Bild hochladen',
  'Replace image': 'Bild ersetzen',
  'Image uploaded.': 'Bild hochgeladen.',
  'Validating and uploading image': 'Bild wird geprüft und hochgeladen',
  'Upload progress': 'Upload-Fortschritt',
  'Cancel upload': 'Upload abbrechen',
  'Hosted image URL': 'URL des gehosteten Bildes',
  'Use image URL': 'Bild-URL verwenden',
  'Remove image': 'Bild entfernen',
  'Alternative text': 'Alternativtext',
  'Image settings': 'Bildeinstellungen',
  'Image width': 'Bildbreite',
  'Image height': 'Bildhöhe',
  'Image fit': 'Bildanpassung',
  Contain: 'Vollständig anzeigen',
  Cover: 'Bereich ausfüllen',
  'Upload provider not configured. Enter an existing HTTPS image URL below.':
    'Kein Upload-Anbieter konfiguriert. Geben Sie unten eine vorhandene HTTPS-Bild-URL ein.',
  'PNG, JPEG or WebP. Maximum 2 MB, 4096 pixels per side and 16 million pixels. SVG is not allowed.':
    'PNG, JPEG oder WebP. Höchstens 2 MB, 4096 Pixel pro Seite und 16 Millionen Pixel. SVG ist nicht erlaubt.',
  'Use a trusted HTTPS PNG, JPEG or WebP asset URL. Hosted assets are not downloaded or verified by this form.':
    'Verwenden Sie eine vertrauenswürdige HTTPS-URL für PNG, JPEG oder WebP. Dieses Formular lädt gehostete Dateien weder herunter noch prüft es sie.',
  'Replacing or removing an image only changes this label. The stored asset is not deleted.':
    'Das Ersetzen oder Entfernen eines Bildes ändert nur dieses Label. Die gespeicherte Datei wird nicht gelöscht.',
  'The image preview could not be loaded. Check the URL and image access permissions.':
    'Die Bildvorschau konnte nicht geladen werden. Prüfen Sie URL und Zugriffsberechtigungen.',
  'Wait for the image upload to finish before saving.':
    'Warten Sie, bis der Bild-Upload abgeschlossen ist, bevor Sie speichern.',
  'No labels are available. Create a label before assigning products.':
    'Keine Labels verfügbar. Erstellen Sie ein Label, bevor Sie Produkte zuweisen.',
  'Browsing is limited to the first 10020 products. Use an exact search to find other products.':
    'Die Übersicht ist auf die ersten 10020 Produkte begrenzt. Verwenden Sie die exakte Suche, um weitere Produkte zu finden.',
  'Product labels': 'Produktlabels',
  Labels: 'Labels',
  'Product assignments': 'Produktzuweisungen',
  'Create label': 'Label erstellen',
  'Edit label': 'Label bearbeiten',
  'Search labels': 'Labels suchen',
  Search: 'Suchen',
  Status: 'Status',
  All: 'Alle',
  Active: 'Aktiv',
  Inactive: 'Inaktiv',
  Name: 'Name',
  Key: 'Schlüssel',
  Priority: 'Priorität',
  Actions: 'Aktionen',
  Edit: 'Bearbeiten',
  Delete: 'Löschen',
  Cancel: 'Abbrechen',
  'Save label': 'Label speichern',
  'Label saved.': 'Label gespeichert.',
  'Label deleted. Existing assignments are preserved.':
    'Label gelöscht. Bestehende Zuweisungen bleiben erhalten.',
  'No labels match. Create a label or change the filters.':
    'Keine passenden Labels. Erstellen Sie ein Label oder ändern Sie die Filter.',
  Previous: 'Zurück',
  Next: 'Weiter',
  Page: 'Seite',
  of: 'von',
  Refresh: 'Aktualisieren',
  Loading: 'Wird geladen',
  Color: 'Textfarbe',
  'Background color': 'Hintergrundfarbe',
  Description: 'Beschreibung',
  'Localized names': 'Übersetzte Namen',
  'Stable keys cannot be renamed or reused after deletion.':
    'Stabile Schlüssel können nach dem Löschen weder umbenannt noch wiederverwendet werden.',
  'Higher priority appears first.': 'Höhere Prioritäten erscheinen zuerst.',
  'Product Card preview': 'Vorschau der Produktkarte',
  'Preview product': 'Vorschauprodukt',
  'Preview only. The storefront renderer is not changed by this application.':
    'Nur Vorschau. Die Darstellung im Storefront wird durch diese Anwendung nicht geändert.',
  'Delete this label?': 'Dieses Label löschen?',
  'The definition will be retained as a tombstone. Existing product assignments will not be removed, and this key cannot be reused.':
    'Die Definition bleibt als Löschmarkierung erhalten. Bestehende Produktzuweisungen werden nicht entfernt und der Schlüssel kann nicht wiederverwendet werden.',
  'Search products': 'Produkte suchen',
  'Exact product key, SKU or localized name':
    'Exakter Produktschlüssel, SKU oder übersetzter Name',
  'Search uses exact matches in the selected data locale; leave empty to browse.':
    'Die Suche verwendet exakte Treffer in der gewählten Datensprache; leer lassen, um alle Produkte zu durchsuchen.',
  'No products match. Change the search to continue.':
    'Keine passenden Produkte. Ändern Sie die Suche.',
  'Choose labels': 'Labels auswählen',
  'Assign selected labels': 'Ausgewählte Labels zuweisen',
  'Remove selected labels': 'Ausgewählte Labels entfernen',
  'Select products on this page. Saves update staged data only.':
    'Wählen Sie Produkte auf dieser Seite. Speichern aktualisiert nur vorgemerkte Daten.',
  'Select product': 'Produkt auswählen',
  Product: 'Produkt',
  'Staged labels': 'Vorgemerkte Labels',
  'Published labels': 'Veröffentlichte Labels',
  None: 'Keine',
  Deleted: 'Gelöscht',
  'Unknown label': 'Unbekanntes Label',
  Publish: 'Veröffentlichen',
  'Publish this product?': 'Dieses Produkt veröffentlichen?',
  'Publishing makes ALL staged product changes live, including unrelated changes. Review the product in Merchant Center before confirming.':
    'Die Veröffentlichung übernimmt ALLE vorgemerkten Produktänderungen, auch andere Änderungen. Prüfen Sie das Produkt vorher im Merchant Center.',
  'Confirm publish': 'Veröffentlichung bestätigen',
  'Product published.': 'Produkt veröffentlicht.',
  'Bulk results': 'Ergebnisse der Sammelbearbeitung',
  Saved: 'Gespeichert',
  Failed: 'Fehlgeschlagen',
  'The operation finished. Review each product result below.':
    'Der Vorgang ist abgeschlossen. Prüfen Sie unten das Ergebnis jedes Produkts.',
  selected: 'ausgewählt',
  'Select all products on this page':
    'Alle Produkte auf dieser Seite auswählen',
  'Read-only access. Ask an administrator for Manage permission to make changes.':
    'Nur Lesezugriff. Wenden Sie sich für die Berechtigung zum Verwalten an einen Administrator.',
  'Select a Merchant Center project.':
    'Wählen Sie ein Merchant-Center-Projekt.',
  'Unable to load data.': 'Daten konnten nicht geladen werden.',
  'Operation failed.': 'Vorgang fehlgeschlagen.',
  Working: 'In Bearbeitung',
  'Label names use the project languages. Existing translations in other languages are retained.':
    'Labelnamen verwenden die Projektsprachen. Bestehende Übersetzungen in anderen Sprachen bleiben erhalten.',
  'Label not found.': 'Label nicht gefunden.',
  'Deleted labels cannot be edited.':
    'Gelöschte Labels können nicht bearbeitet werden.',
  'Schema not compatible': 'Schema nicht kompatibel',
  'Staged assignments saved.': 'Vorgemerkte Zuweisungen gespeichert.',
  'Pending staged changes': 'Vorgemerkte Änderungen vorhanden',
  'Not published': 'Nicht veröffentlicht',
};

export function useText() {
  const intl = useIntl();
  return (message: string) =>
    intl.formatMessage({ id: message, defaultMessage: message });
}
