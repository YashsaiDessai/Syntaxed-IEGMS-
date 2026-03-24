from optimizer import optimize_grid, get_entity_schedule_status, _is_peak_hour

# Test 1: school closed at 19h
sched = get_entity_schedule_status(19.0)
school = sched['school']
print(f'School at 19h: active={school["active"]} cap={school["cap_pct"]}%')
assert not school['active'], "School should be closed at 19h"
assert school['cap_pct'] == 5, "School cap should be 5% when closed"

# Test 2: school active at 10h
sched2 = get_entity_schedule_status(10.0)
school2 = sched2['school']
print(f'School at 10h: active={school2["active"]} cap={school2["cap_pct"]}%')
assert school2['active'], "School should be active at 10h"

# Test 3: peak hour check
assert _is_peak_hour(8.5) == True
assert _is_peak_hour(18.5) == True
assert _is_peak_hour(14.0) == False
print(f'Peak hours: 8.5h={_is_peak_hour(8.5)}, 18.5h={_is_peak_hour(18.5)}, 14h={_is_peak_hour(14.0)}')

# Test 4: optimizer with time at 19h (evening — school closed, peak active)
loads = {'hospital': 85, 'school': 100, 'industry': 140, 'residential': 150}
result = optimize_grid(loads, loads, 200.0, hour=19.0)
print(f'Hour=19 school_supplied={result["supplied"]["school"]:.1f} MW (should be ~5% of 100=5 MW)')
print(f'Freed MW: {result["freed_mw"]}')
print(f'Peak boost: {result["peak_boost_active"]}')
print(f'Status: {result["status_code"]}')
print(f'Actions (first 3):')
for a in result["actions"][:3]:
    print(f'  - {a}')

assert result["supplied"]["school"] < 10, "School should have minimal supply at 19h"
assert result["freed_mw"] > 50, "Should have freed significant MW from school at 19h"

print('\nALL TESTS PASSED')
