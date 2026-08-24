import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AesService } from '../common/encryption/aes.service';

export interface CreateCustomerDto {
  nationalId: string;
  firstName: string;
  lastName: string;
  phone?: string;
  address?: string;
}

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aes: AesService,
  ) {}

  /**
   * Create a customer with encrypted PII and phone hash for dedup.
   */
  async create(dto: CreateCustomerDto) {
    // Check for duplicate phone
    if (dto.phone) {
      const phoneHash = this.aes.hash(dto.phone);
      const existing = await this.prisma.customer.findFirst({ where: { phoneHash } });
      if (existing) {
        // Return existing (masked) rather than creating duplicate
        return this.formatCustomer(existing, false);
      }
    }

    const customer = await this.prisma.customer.create({
      data: {
        nationalIdEnc: this.aes.encrypt(dto.nationalId),
        firstNameEnc:  this.aes.encrypt(dto.firstName),
        lastNameEnc:   this.aes.encrypt(dto.lastName),
        phone:         dto.phone,
        phoneHash:     dto.phone ? this.aes.hash(dto.phone) : null,
        address:       dto.address,
      },
    });

    return this.formatCustomer(customer, false);
  }

  /**
   * Find by ID. decrypt=true only for privileged endpoints.
   */
  async findById(id: string, decrypt = false) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new NotFoundException('Customer not found');
    return this.formatCustomer(customer, decrypt);
  }

  /**
   * Lookup by phone number for deduplication.
   */
  async findByPhone(phone: string) {
    const phoneHash = this.aes.hash(phone);
    const customer = await this.prisma.customer.findFirst({ where: { phoneHash } });
    if (!customer) return null;
    return this.formatCustomer(customer, false);
  }

  /**
   * Format customer response — always masks national ID.
   * decrypt=true returns full name, false returns first name only.
   */
  private formatCustomer(customer: any, decrypt: boolean) {
    const firstName = this.aes.decrypt(customer.firstNameEnc);
    const lastName = this.aes.decrypt(customer.lastNameEnc);
    const nationalIdDecrypted = this.aes.decrypt(customer.nationalIdEnc);

    return {
      id: customer.id,
      nationalId: this.aes.maskNationalId(nationalIdDecrypted), // Always masked in UI
      firstName: decrypt ? firstName : firstName, // First name is safe to show
      lastName: decrypt ? lastName : `${lastName[0]}${'x'.repeat(lastName.length - 1)}`,
      fullName: `${firstName} ${lastName[0]}${'x'.repeat(Math.max(0, lastName.length - 1))}`,
      phone: customer.phone ? customer.phone.replace(/(\d{3})\d{3}(\d{4})/, '$1-xxx-$2') : null,
      address: customer.address,
      createdAt: customer.createdAt,
    };
  }
}
