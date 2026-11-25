# Ejemplo tipo I: addi/addiu, ori, lw, sw, beq, bne
# Estado final esperado:
#   $t0 = 5, $t1 = -1 (0xFFFFFFFF), $t2 = 0x0000FFFF, $t3 = -1
#   $t4 = 0 (la instruccion saltada por beq no se ejecuta), $t5 = 0 (ciclo de 3 vueltas)
#   Mem[0x0000] = 5, Mem[0x0004] = 0xFFFFFFFF

        addiu $t0, $zero, 5       # ejemplo de la consigna: 0x24080005 -> $t0 = 5
        addi  $t1, $zero, -1      # extension con signo: $t1 = 0xFFFFFFFF
        ori   $t2, $zero, 0xFFFF  # extension con ceros: $t2 = 0x0000FFFF
        sw    $t0, 0($zero)       # Mem[0x0000] = 5
        sw    $t1, 4($zero)       # Mem[0x0004] = 0xFFFFFFFF
        lw    $t3, 4($zero)       # $t3 = Mem[0x0004] = -1
        beq   $t3, $t1, igual     # rama TOMADA ($t3 == $t1): salta la siguiente
        addi  $t4, $zero, 99      # no se ejecuta
igual:  bne   $t0, $t0, fin       # rama NO tomada ($t0 == $t0)
        addi  $t5, $zero, 3       # contador = 3
ciclo:  addi  $t5, $t5, -1        # rama hacia atras: se repite 3 veces
        bne   $t5, $zero, ciclo
fin:    beq   $zero, $zero, fin   # autosalto: punto final observable
