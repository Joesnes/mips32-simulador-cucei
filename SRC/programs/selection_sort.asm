# Ordenamiento por seleccion (Selection Sort) - usa solo las 12 instrucciones del proyecto
#
# Memoria de datos (big-endian, palabras de 32 bits):
#   0x0000      N (numero de elementos, N >= 1)
#   0x0004 ...  A[0] .. A[N-1]   -> se ordenan de menor a mayor (con signo) en el mismo lugar
#
# Registros:
#   $s0 = base del arreglo (4)        $s1 = N              $s2 = N * 4 (limite en bytes)
#   $t0 = i_off (desplazamiento de i) $t1 = min_off        $t2 = j_off
#   $t3 = &A[minIdx] / A[minIdx]      $t4 = &A[j] / A[j]   $t5 = bandera de slt / min_off - i_off
#   $t6 = tmp del intercambio         $t7 = &A[i]
#
# Punto final observable: "fin: j fin" con el arreglo ya ordenado en memoria.

        ori   $s0, $zero, 4        # base = 4
        lw    $s1, 0($zero)        # N = Mem[0]
        add   $s2, $s1, $s1        # 2N
        add   $s2, $s2, $s2        # 4N (limite en bytes)
        and   $t0, $zero, $zero    # i_off = 0
outer:  addi  $t2, $t0, 4          # j_off = i_off + 4
        beq   $t2, $s2, fin        # i == N-1 -> terminado
        or    $t1, $t0, $zero      # min_off = i_off
inner:  add   $t4, $s0, $t2        # &A[j]
        lw    $t4, 0($t4)          # A[j]
        add   $t3, $s0, $t1        # &A[minIdx]
        lw    $t3, 0($t3)          # A[minIdx]
        slt   $t5, $t4, $t3        # A[j] < A[minIdx] (con signo)
        beq   $t5, $zero, next     # si no es menor, sigue
        or    $t1, $t2, $zero      # min_off = j_off
next:   addi  $t2, $t2, 4          # j++
        bne   $t2, $s2, inner      # mientras j < N
        sub   $t5, $t1, $t0        # minIdx - i
        beq   $t5, $zero, skip     # si minIdx == i, no hay intercambio
        add   $t7, $s0, $t0        # &A[i]
        lw    $t6, 0($t7)          # tmp = A[i]
        add   $t3, $s0, $t1        # &A[minIdx]
        lw    $t4, 0($t3)          # A[minIdx]
        sw    $t4, 0($t7)          # A[i] = A[minIdx]
        sw    $t6, 0($t3)          # A[minIdx] = tmp
skip:   addi  $t0, $t0, 4          # i++
        j     outer                # siguiente pasada
fin:    j     fin                  # autosalto: arreglo ordenado
