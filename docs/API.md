# API Reference

The ACJU Prayer Times API provides public, unauthenticated access to structured prayer time data.
Namespace: `/api/v1/`

## Base URL
```
https://api.yourdomain.com
```
*(When running locally: `http://localhost:3000`)*

## Code Examples

### JavaScript (fetch)
```javascript
const response = await fetch("https://api.yourdomain.com/api/v1/prayer-times/today/all");
const result = await response.json();
console.log(result.data.locations);
```

### Python (requests)
```python
import requests

url = "https://api.yourdomain.com/api/v1/prayer-times/batticaloa-ampara/2026-08-25"
response = requests.get(url)
data = response.json()
print(data['data']['prayer_times'])
```

### PHP (cURL)
```php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "https://api.yourdomain.com/api/v1/locations");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
$output = curl_exec($ch);
curl_close($ch);
print_r(json_decode($output, true));
```

### Dart (http)
```dart
import 'package:http/http.dart' as http;
import 'dart:convert';

var url = Uri.parse('https://api.yourdomain.com/api/v1/prayer-times/today?location=colombo');
var response = await http.get(url);
var data = jsonDecode(response.body);
print(data['data']['prayer_times']);
```

## Error Codes
| HTTP Status | Code | Description |
|-------------|------|-------------|
| 400 | `INVALID_DATE` | Date format is invalid or it's an impossible calendar date. |
| 400 | `INVALID_RANGE` | Provided date range exceeds 1 year or `from` > `to`. |
| 404 | `LOCATION_NOT_FOUND` | Provided location slug does not exist. |
| 404 | `DATA_NOT_AVAILABLE` | No prayer times could be found for the queried date. |
| 429 | `RATE_LIMIT_EXCEEDED`| More than 100 requests per minute from an IP. |
| 500 | `DATABASE_ERROR` | An internal database query failed. |

## Source Attribution
All prayer time responses include an attribution object pointing to the ACJU data page. Please display this to your users if appropriate.
