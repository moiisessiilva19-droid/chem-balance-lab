# TEST_CASES.md

## Core QA cases

| ID | Case | Reaction | Mode | Inputs | Expected |
| --- | --- | --- | --- | --- | --- |
| 1 | K from known equilibrium | N2(g) + 3 H2(g) <=> 2 NH3(g) | Calcular K desde equilibrio conocido | [N2]=0.2, [H2]=0.6, [NH3]=0.8 | Kc = 14.8148148, error = 0, Q = No aplica |
| 2 | Q > K | H2(g) + I2(g) <=> 2 HI(g) | Calcular Q y predecir sentido | H2=0.2, I2=0.2, HI=5.0, Kc=20 | Q=625, Q>K, hacia reactivos |
| 3 | Q < K | N2(g) + 3 H2(g) <=> 2 NH3(g) | Calcular Q y predecir sentido | N2=1, H2=3, NH3=0, Kc=15.73 | Q=0, Q<K, hacia productos |
| 4 | Q = K | H2(g) + I2(g) <=> 2 HI(g) | Calcular Q y predecir sentido | H2=1, I2=1, HI=sqrt(20), Kc=20 | Q=20, Q=K, en equilibrio |
| 5 | Solids excluded | CaCO3(s) <=> CaO(s) + CO2(g) | Calcular Q y predecir sentido | CO2=0.4, Kc=3.2 | Kc=[CO2], Q=0.4, hacia productos; pressure perturbation separately favors reactants |
| 6 | Liquids excluded | H2O(l) <=> H2(g) + 1/2 O2(g) | Calcular Q y predecir sentido | H2=2, O2=0.25, Kc=1 | H2O excluded; Q=[H2][O2]^0.5 = 1, Q=K |
| 7 | NO2 dimerization | 2 NO2(g) <=> N2O4(g) | Calcular Q y predecir sentido | NO2=0.8, N2O4=0.6, Kc=5 | Q=0.9375, Q<K, hacia productos; pressure increase favors products |

## Parser cases

| ID | Input | Expected |
| --- | --- | --- |
| P1 | N2(g) + 3H2(g) <=> 2NH3(g) | N2 coeff 1, H2 coeff 3, NH3 coeff 2 |
| P2 | 2NO2(g) <=> N2O4(g) | NO2 coeff 2, N2O4 coeff 1 |
| P3 | CaCO3(s) => CaO(s) + CO2(g) | accepts => arrow |
| P4 | H2(g) + I2(g) <=> 2HI(g) | accepts alternate arrow |
| P5 | no state species | validation message: falta estado fisico |

## Kc/Kp conversion cases

| ID | Reaction | Given | Expected |
| --- | --- | --- | --- |
| KP1 | H2(g)+I2(g)<=>2HI(g) | Kc=20, T=500, delta n=0 | Kp=20 |
| KP2 | N2(g)+3H2(g)<=>2NH3(g) | Kc=15.73, T=500, delta n=-2 | Kp=15.73/(RT)^2 |
| KP3 | 2NO2(g)<=>N2O4(g) | Kc=5, T=298.15, delta n=-1 | Kp=5/(RT) |
| KP4 | CaCO3(s)<=>CaO(s)+CO2(g) | Kc=3.2, T=298.15, delta n=1 | Kp=3.2RT |
| KP5 | CH3COOH(aq)<=>H+(aq)+CH3COO-(aq) | Kc provided | Kp conversion = No aplica |

## Xi solver cases

| ID | Reaction | Initial | K | Expected |
| --- | --- | --- | --- | --- |
| X1 | H2(g)+I2(g)<=>2HI(g) | H2=1,I2=1,HI=0 | Kc=4 | xi approx 0.5 |
| X2 | H2(g)+I2(g)<=>2HI(g) | H2=0.2,I2=0.2,HI=5 | Kc=20 | xi negative, toward reactants, no negative concentrations |
| X3 | N2(g)+3H2(g)<=>2NH3(g) | N2=1,H2=3,NH3=0 | Kc=15.73 | xi positive and below H2/3 |
| X4 | 2NO2(g)<=>N2O4(g) | NO2=0.8,N2O4=0.6 | Kc=5 | xi positive, NO2 remains >=0 |
| X5 | invalid interval | missing initial reactant | Kc>0 | controlled failure message |

## State and UX validation

| ID | Case | Expected |
| --- | --- | --- |
| S1 | Load 5 exercises consecutively | no stale species remain |
| S2 | Decimal inputs 0.8, 0.6, 0.25, 1.75 | accepted and calculated |
| S3 | Temporary input 0. | preserved while typing |
| S4 | Empty temporary numeric field | no crash; validation message |
| S5 | Mode Calcular K desde equilibrio conocido | Q, Q/K, direction, xi show No aplica where relevant |
| S6 | Mode Calcular Q y predecir sentido | xi and error relative show No aplica |
| S7 | Le Chatelier pressure for CaCO3 | separate conclusion: pressure increase favors reactants |
| S8 | Le Chatelier pressure for 2NO2 | separate conclusion: pressure increase favors products |