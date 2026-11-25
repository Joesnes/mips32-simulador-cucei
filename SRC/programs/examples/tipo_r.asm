# Ejemplo tipo R: add, sub, and, or, slt (shamt = 0)
# Carga dos valores con addi y aplica las 5 instrucciones R.
# Estado final esperado:
#   $t0 = 12, $t1 = -6 (0xFFFFFFFA)
#   $t2 = 6, $t3 = 18, $t4 = 8, $t5 = -2 (0xFFFFFFFE), $t6 = 1, $t7 = 0, $zero = 0

        addi $t0, $zero, 12     # $t0 = 12
        addi $t1, $zero, -6     # $t1 = -6
        add  $t2, $t0, $t1      # $t2 = 12 + (-6) = 6
        sub  $t3, $t0, $t1      # $t3 = 12 - (-6) = 18
        and  $t4, $t0, $t1      # $t4 = 0x0000000C & 0xFFFFFFFA = 8
        or   $t5, $t0, $t1      # $t5 = 0x0000000C | 0xFFFFFFFA = -2
        slt  $t6, $t1, $t0      # $t6 = 1 (-6 < 12 con signo)
        slt  $t7, $t0, $t1      # $t7 = 0 (12 < -6 es falso)
        add  $zero, $t0, $t0    # escritura a $zero: se descarta, sigue en 0
fin:    beq  $zero, $zero, fin  # autosalto: punto final observable
