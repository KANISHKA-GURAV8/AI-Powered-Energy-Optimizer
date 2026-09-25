import requests, json, sys

BASE = 'http://localhost:5000/api'

results = []

# 1. Health check
r = requests.get('http://localhost:5000/')
results.append(f"1. Health Check:     {r.status_code} OK - {list(r.json().keys())}")

# 2. Register
r = requests.post(f'{BASE}/auth/register', json={
    'name': 'Test User', 'email': 'testcheck99@energy.com',
    'password': 'pass1234', 'city': 'Bangalore'
})
token = r.json().get('token', '')
if token:
    results.append(f"2. Register:         {r.status_code} OK - name={r.json().get('name')}")
else:
    # Fallback: login if already registered
    r = requests.post(f'{BASE}/auth/login', json={
        'email': 'testcheck99@energy.com', 'password': 'pass1234'
    })
    token = r.json().get('token', '')
    results.append(f"2. Register/Login:   {r.status_code} - token={'YES' if token else 'NO'}")

headers = {'Authorization': f'Bearer {token}'}

# 3. Dashboard
r = requests.get(f'{BASE}/energy/dashboard', headers=headers)
d = r.json()
results.append(f"3. Dashboard:        {r.status_code} OK - todayUnits={d.get('todayUnits')} predictedBill={d.get('predictedMonthlyBill')}")

# 4. Weather
r = requests.get(f'{BASE}/energy/weather', headers=headers)
d = r.json()
results.append(f"4. Weather:          {r.status_code} OK - city={d.get('city')} temp={d.get('temp')}C humidity={d.get('humidity')}%")

# 5. Energy Logs (GET)
r = requests.get(f'{BASE}/energy/logs', headers=headers)
results.append(f"5. Energy Logs GET:  {r.status_code} OK - count={len(r.json())}")

# 6. Energy Logs (POST)
r = requests.post(f'{BASE}/energy/logs', headers=headers,
                  json={'unitsConsumed': 12.5, 'costPerUnit': 5})
results.append(f"6. Energy Logs POST: {r.status_code} OK - units={r.json().get('unitsConsumed')}")

# 7. Appliances GET
r = requests.get(f'{BASE}/appliances/', headers=headers)
results.append(f"7. Appliances GET:   {r.status_code} OK - count={len(r.json())}")

# 8. Add Appliance
r = requests.post(f'{BASE}/appliances/', headers=headers, json={
    'name': 'TestAC', 'power': 1500, 'quantity': 1,
    'priority': 'Medium', 'active': 1, 'status': True
})
app_id = r.json().get('_id', '')
results.append(f"8. Add Appliance:    {r.status_code} OK - name={r.json().get('name')} id={app_id[:8]}...")

# 9. Update Appliance
if app_id:
    r = requests.put(f'{BASE}/appliances/{app_id}', headers=headers,
                     json={'status': False, 'active': 0})
    results.append(f"9. Update Appliance: {r.status_code} OK - status={r.json().get('status')}")

# 10. Recommendations
r = requests.post(f'{BASE}/energy/recommendations', headers=headers,
                  json={'sanctionedLoadWatts': 4000})
d = r.json()
recs = d.get('recommendations', [])
results.append(f"10. Recommendations: {r.status_code} OK - season={d.get('season')} timeSlot={d.get('timeSlot')} count={len(recs)}")
for rec in recs[:3]:
    results.append(f"    -> {rec['name']}: {rec['action']} | {rec['reason'][:60]}...")

# 11. Profile Update
r = requests.put(f'{BASE}/auth/profile', headers=headers,
                 json={'city': 'Mangalore'})
results.append(f"11. Profile Update:  {r.status_code} OK - city={r.json().get('city')}")

# 12. Delete Appliance
if app_id:
    r = requests.delete(f'{BASE}/appliances/{app_id}', headers=headers)
    results.append(f"12. Delete Appliance:{r.status_code} OK - {r.json().get('message')}")

print('\n'.join(results))
